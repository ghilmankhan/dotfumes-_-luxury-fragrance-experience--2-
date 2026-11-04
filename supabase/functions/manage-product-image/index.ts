import { createClient } from 'npm:@supabase/supabase-js@2';
import { inspectImageBytes } from '../../../src/lib/imageBinary.ts';

const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type', 'Access-Control-Allow-Methods': 'POST, OPTIONS' };
const reply = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });
const maxOriginal = 5 * 1024 * 1024;
const maxRequest = 9 * 1024 * 1024;
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const variantNames = ['thumb', 'card', 'gallery'] as const;
const readLimitedForm = async (request: Request) => {
  if (!request.body) throw new Error('Missing image body');
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > maxRequest) { await reader.cancel(); throw new Error('Image request is too large'); }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  const body = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) { body.set(chunk, offset); offset += chunk.length; }
  return new Request(request.url, { method: 'POST', headers: { 'content-type': request.headers.get('content-type') || '' }, body }).formData();
};

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response(null, { headers: cors });
  if (request.method !== 'POST') return reply({ message: 'Method not allowed.' }, 405);
  if (Number(request.headers.get('content-length') || 0) > maxRequest) return reply({ message: 'Image request is too large.' }, 413);
  const url = Deno.env.get('SUPABASE_URL');
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !key) return reply({ message: 'Image service is not configured.' }, 503);
  const bearer = request.headers.get('authorization')?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!bearer) return reply({ message: 'Sign in is required.' }, 401);
  const service = createClient(url, key, { auth: { persistSession: false } });
  const { data: { user }, error: authError } = await service.auth.getUser(bearer);
  if (authError || !user || user.app_metadata?.role !== 'admin') return reply({ message: 'Admin access is required.' }, 403);

  try {
    const form = await readLimitedForm(request);
    const action = form.get('action');
    if (action === 'cleanup') {
      const paths = JSON.parse(String(form.get('paths') || '[]')) as unknown;
      if (!Array.isArray(paths) || paths.length > 30 || !paths.every((path) => typeof path === 'string' && uuid.test(path.split('/')[0]) && /^[0-9a-f-]{36}\/variants\/(thumb|card|gallery)-[0-9a-f-]{36}[.]webp$/i.test(path))) {
        return reply({ message: 'Invalid cleanup request.' }, 400);
      }
      const removed: string[] = [];
      for (const path of paths) {
        const imageId = path.split('/')[0];
        const { data: current, error: readError } = await service.from('product_images').select('variants').eq('id', imageId).maybeSingle();
        if (readError) throw readError;
        if (current && Object.values(current.variants ?? {}).some((variant) => (variant as { path?: string })?.path === path)) continue;
        const { error: removeError } = await service.storage.from('product-images').remove([path]);
        if (removeError) throw removeError;
        removed.push(path);
      }
      return reply({ removed });
    }
    if (action !== 'upload' && action !== 'variants') return reply({ message: 'Invalid image action.' }, 400);
    const productId = String(form.get('productId') || '');
    const imageId = String(form.get('imageId') || '');
    if (!uuid.test(imageId) || !/^[a-zA-Z0-9-]{1,100}$/.test(productId)) return reply({ message: 'Invalid image identity.' }, 400);
    const original = form.get('original');
    if (!(original instanceof File) || original.size < 24 || original.size > maxOriginal) return reply({ message: 'Original image must be under 5 MB.' }, 400);
    const originalBytes = new Uint8Array(await original.arrayBuffer());
    const source = inspectImageBytes(originalBytes);
    if (source.mime !== original.type || source.width < 400 || source.height < 400 || source.width > 8000 || source.height > 8000 || source.width * source.height > 40000000) {
      return reply({ message: 'Original image type or dimensions are invalid.' }, 400);
    }
    let existing: Record<string, unknown> | null = null;
    if (action === 'variants') {
      const { data, error } = await service.from('product_images').select('*').eq('id', imageId).eq('product_id', productId).maybeSingle();
      if (error) throw error;
      if (!data) return reply({ message: 'Product photo was not found.' }, 404);
      existing = data;
    }
    const prepared: { name: typeof variantNames[number]; bytes: Uint8Array; width: number; height: number }[] = [];
    for (const name of variantNames) {
      const file = form.get(name);
      if (!(file instanceof File) || file.size < 24 || file.size > 1500000 || file.type !== 'image/webp') return reply({ message: `Invalid ${name} image.` }, 400);
      const bytes = new Uint8Array(await file.arrayBuffer());
      const details = inspectImageBytes(bytes);
      const originalRatio = source.width / source.height;
      const variantRatio = details.width / details.height;
      const rotated = source.mime === 'image/jpeg' && Math.abs(variantRatio - 1 / originalRatio) < Math.abs(variantRatio - originalRatio);
      if (details.mime !== 'image/webp' || details.width > (rotated ? source.height : source.width) || details.height > (rotated ? source.width : source.height) ||
          details.width > ({ thumb: 320, card: 640, gallery: 1600 }[name]) ||
          Math.min(Math.abs(variantRatio - originalRatio), source.mime === 'image/jpeg' ? Math.abs(variantRatio - 1 / originalRatio) : Infinity) > 0.012) return reply({ message: `Invalid ${name} dimensions.` }, 400);
      prepared.push({ name, bytes, width: details.width, height: details.height });
    }

    const bucket = service.storage.from('product-images');
    const uploadedVariants: string[] = [];
    const variants: Record<string, { url: string; path: string; width: number; height: number; bytes: number }> = {};
    try {
      for (const item of prepared) {
        const path = `${imageId}/variants/${item.name}-${crypto.randomUUID()}.webp`;
        const { error } = await bucket.upload(path, item.bytes, { contentType: 'image/webp', upsert: false, cacheControl: '31536000' });
        if (error) throw error;
        uploadedVariants.push(path);
        variants[item.name] = { path, url: bucket.getPublicUrl(path).data.publicUrl, width: item.width, height: item.height, bytes: item.bytes.byteLength };
      }
      let originalPath = existing?.original_path as string | null | undefined;
      let originalUrl = existing?.original_url as string | undefined;
      if (action === 'upload') {
        const extension = source.mime === 'image/jpeg' ? 'jpg' : source.mime === 'image/png' ? 'png' : 'webp';
        originalPath = `${imageId}/original/${crypto.randomUUID()}.${extension}`;
        const { error } = await bucket.upload(originalPath, originalBytes, { contentType: source.mime, upsert: false, cacheControl: '31536000' });
        if (error) throw error;
        originalUrl = bucket.getPublicUrl(originalPath).data.publicUrl;
      }
      return reply({ image: { id: imageId, originalUrl, originalPath: originalPath ?? null, originalMime: source.mime, originalWidth: source.width, originalHeight: source.height, originalBytes: original.size, variants, slot: existing?.slot ?? 'lifestyle', position: existing?.position ?? 0, isPrimary: existing?.is_primary ?? false, altText: existing?.alt_text ?? '' } });
    } catch (error) {
      if (uploadedVariants.length) await bucket.remove(uploadedVariants);
      throw error;
    }
  } catch (error) {
    if (error instanceof Error && error.message === 'Image request is too large') return reply({ message: error.message }, 413);
    return reply({ message: 'Image operation failed. No product changes were saved.' }, 400);
  }
});
