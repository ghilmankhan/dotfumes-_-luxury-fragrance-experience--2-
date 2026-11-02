import { createClient } from 'npm:@supabase/supabase-js@2';

const headers = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type', 'Access-Control-Allow-Methods': 'POST, OPTIONS' };
const respond = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...headers, 'Content-Type': 'application/json' } });
const MAX_BODY_BYTES = 8 * 1024 * 1024;
const readLimitedJson = async (request: Request) => {
  if (!request.body) throw new Error('Invalid order body');
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > MAX_BODY_BYTES) { await reader.cancel(); throw new Error('Order request is too large'); }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes));
};
Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response(null, { headers });
  if (request.method !== 'POST') return respond({ success: false, message: 'Method not allowed.' }, 405);
  const contentLength = Number(request.headers.get('content-length') || 0);
  if (contentLength > MAX_BODY_BYTES) return respond({ success: false, message: 'Order request is too large.' }, 413);
  try {
    const body = await readLimitedJson(request);
    if (!body || typeof body !== 'object' || body.honeypot || !body.order) return respond({ success: false, message: 'Invalid order.' }, 400);
    const cashOnDelivery = body.order.paymentMethod === 'cash-on-delivery';
    if (!cashOnDelivery && !body.slip) return respond({ success: false, message: 'Payment proof is required.' }, 400);
    const slip = body.slip;
    if (!cashOnDelivery && (!['image/jpeg','image/png','image/webp','application/pdf'].includes(slip.mimeType) || !Number.isInteger(slip.fileSize) || slip.fileSize < 1 || slip.fileSize > 5 * 1024 * 1024 || typeof slip.base64 !== 'string' || slip.base64.length > 7 * 1024 * 1024)) {
      return respond({ success: false, message: 'Invalid payment slip.' }, 400);
    }
    const bytes = cashOnDelivery ? null : Uint8Array.from(atob(slip.base64), (c) => c.charCodeAt(0));
    if (!cashOnDelivery && bytes?.length !== slip.fileSize) return respond({ success: false, message: 'Invalid payment slip size.' }, 400);
    const signatures: Record<string, boolean> = {
      'image/jpeg': bytes?.[0] === 0xff && bytes?.[1] === 0xd8,
      'image/png': bytes?.[0] === 0x89 && bytes?.[1] === 0x50 && bytes?.[2] === 0x4e && bytes?.[3] === 0x47,
      'image/webp': bytes ? String.fromCharCode(...bytes.slice(0, 4)) === 'RIFF' && String.fromCharCode(...bytes.slice(8, 12)) === 'WEBP' : false,
      'application/pdf': bytes ? String.fromCharCode(...bytes.slice(0, 4)) === '%PDF' : false,
    };
    if (!cashOnDelivery && !signatures[slip.mimeType]) return respond({ success: false, message: 'Payment slip content does not match its type.' }, 400);
    const url = Deno.env.get('SUPABASE_URL');
    const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!url || !key) return respond({ success: false, message: 'Order service is not configured.' }, 503);
    const client = createClient(url, key, { auth: { persistSession: false } });
    let path: string | null = null;
    if (!cashOnDelivery && bytes) {
      const extensions: Record<string, string> = { 'image/jpeg':'jpg', 'image/png':'png', 'image/webp':'webp', 'application/pdf':'pdf' };
      const extension = extensions[slip.mimeType];
      path = `${new Date().toISOString().slice(0,10)}/${crypto.randomUUID()}.${extension}`;
      const uploaded = await client.storage.from('payment-slips').upload(path, bytes, { contentType: slip.mimeType, upsert: false });
      if (uploaded.error) throw uploaded.error;
    }
    const { data, error } = await client.rpc('submit_order', { p_order: body.order, p_slip_path: path });
    if (error) { if (path) await client.storage.from('payment-slips').remove([path]); throw error; }
    return respond({ success: true, ...data, message: 'Order request received.' });
  } catch (error) {
    if (error instanceof Error && error.message === 'Order request is too large') {
      return respond({ success: false, message: error.message }, 413);
    }
    const message = error instanceof Error && /^(Insufficient stock|A product is unavailable|Invalid order|Too many order requests|Order service is busy|Payment method is unavailable|Missing customer details|Missing payment reference)/.test(error.message)
      ? error.message : 'Order could not be submitted. Please retry or contact Dotfumes.';
    return respond({ success: false, message }, 400);
  }
});
