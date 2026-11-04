import type { Product } from '../models/types';
import { supabase } from './supabase';
import { createImageVariants, legacyGallery, projectGallery } from './productImages';
import type { ProductImageAsset } from '../models/types';

export type ProductInput = Product & { active: boolean };

const isStringArray = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every((item) => typeof item === 'string');

export const parseProduct = (value: unknown): Product | null => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const row = value as Record<string, unknown>;
  if (
    typeof row.id !== 'string' || !row.id ||
    typeof row.sku !== 'string' || !row.sku ||
    typeof row.name !== 'string' || !row.name ||
    typeof row.slug !== 'string' || !row.slug ||
    typeof row.description !== 'string' ||
    typeof row.short_description !== 'string' ||
    typeof row.price !== 'number' || !Number.isFinite(row.price) || row.price < 0 ||
    typeof row.stock !== 'number' || !Number.isInteger(row.stock) || row.stock < 0 ||
    !['Men', 'Women', 'Unisex'].includes(String(row.category)) ||
    typeof row.active !== 'boolean' ||
    !row.images || typeof row.images !== 'object' || Array.isArray(row.images) ||
    !row.notes || typeof row.notes !== 'object' || Array.isArray(row.notes)
  ) return null;
  const images = row.images as Record<string, unknown>;
  const notes = row.notes as Record<string, unknown>;
  if (
    typeof images.front !== 'string' || typeof images.angle !== 'string' ||
    typeof images.flatLay !== 'string' || !isStringArray(images.lifestyle) ||
    !isStringArray(notes.top) || !isStringArray(notes.heart) || !isStringArray(notes.base)
  ) return null;
  return {
    id: row.id, sku: row.sku, productId: row.id, name: row.name, slug: row.slug,
    description: row.description, shortDescription: row.short_description,
    price: row.price, stock: row.stock,
    ...(typeof row.size_ml === 'number' && row.size_ml > 0 ? { sizeMl: row.size_ml } : {}),
    category: row.category as Product['category'], active: row.active,
    lowStock: row.stock <= 3,
    featured: row.featured === true,
    sortOrder: typeof row.sort_order === 'number' ? row.sort_order : 100,
    images: { front: images.front, angle: images.angle, flatLay: images.flatLay, lifestyle: images.lifestyle },
    notes: { top: notes.top, heart: notes.heart, base: notes.base },
  };
};

export const fetchSupabaseProducts = async (): Promise<Product[]> => {
  if (!supabase) throw new Error('Supabase is not configured.');
  const { data, error } = await supabase.from('products').select('*').order('sort_order').order('name');
  if (error) throw error;
  const products = (data ?? []).map(parseProduct);
  if (products.some((product) => product === null)) throw new Error('Catalog contains an invalid product record.');
  const parsed = products as Product[];
  const { data: media, error: mediaError } = await supabase.from('product_images').select('*').order('position');
  if (mediaError) {
    if (mediaError.code === '42P01' || mediaError.code === 'PGRST205') return parsed;
    throw mediaError;
  }
  const byProduct = new Map<string, ProductImageAsset[]>();
  for (const row of media ?? []) {
    const asset: ProductImageAsset = {
      id: row.id, originalUrl: row.original_url, originalPath: row.original_path,
      originalMime: row.original_mime ?? undefined, originalWidth: row.original_width ?? undefined,
      originalHeight: row.original_height ?? undefined, originalBytes: row.original_bytes ?? undefined,
      variants: row.variants ?? {}, slot: row.slot, position: row.position,
      isPrimary: row.is_primary, altText: row.alt_text ?? '',
    };
    byProduct.set(row.product_id, [...(byProduct.get(row.product_id) ?? []), asset]);
  }
  return parsed.map((product) => {
    const imageAssets = byProduct.get(product.id);
    return imageAssets?.length ? { ...product, images: projectGallery(imageAssets), imageAssets } : product;
  });
};

export const saveSupabaseProduct = async (product: ProductInput) => {
  if (!supabase) throw new Error('Supabase is not configured.');
  const assets = product.imageAssets?.length ? product.imageAssets : legacyGallery(product);
  const primaryCount = assets.filter((asset) => asset.isPrimary).length;
  if (primaryCount !== 1) throw new Error('Exactly one main product photo is required.');
  const { error } = await supabase.rpc('admin_save_product_with_images', { p_product: {
    id: product.id, sku: product.sku.trim(), slug: product.slug.trim(), name: product.name.trim(),
    price: product.price, stock: product.stock, size_ml: product.sizeMl ?? null, category: product.category, active: product.active,
    featured: product.featured ?? false, sort_order: product.sortOrder ?? 100,
    description: product.description.trim(), short_description: product.shortDescription.trim(),
    notes: product.notes,
  }, p_images: assets.map((asset, position) => ({
    id: asset.id, original_url: asset.originalUrl, original_path: asset.originalPath,
    original_mime: asset.originalMime ?? null, original_width: asset.originalWidth ?? null,
    original_height: asset.originalHeight ?? null, original_bytes: asset.originalBytes ?? null,
    variants: asset.variants, slot: asset.slot, position, is_primary: asset.isPrimary,
    alt_text: asset.altText,
  })) });
  if (error) throw error;
};

export const archiveSupabaseProduct = async (id: string) => {
  if (!supabase) throw new Error('Supabase is not configured.');
  const { error } = await supabase.rpc('admin_set_product_visibility', { p_product_id: id, p_active: false });
  if (error) throw error;
};

export const deleteSupabaseProduct = async (id: string) => {
  if (!supabase) throw new Error('Supabase is not configured.');
  const { error } = await supabase.rpc('admin_delete_product', { p_product_id: id });
  if (error) throw error;
};

export const uploadProductImage = async (file: File, productId: string) => {
  if (!supabase) throw new Error('Supabase is not configured.');
  const { variants } = await createImageVariants(file);
  const form = new FormData();
  form.set('action', 'upload'); form.set('productId', productId);
  form.set('imageId', crypto.randomUUID()); form.set('original', file);
  for (const [name, blob] of Object.entries(variants)) if (blob) form.set(name, blob, `${name}.webp`);
  const { data, error } = await supabase.functions.invoke('manage-product-image', { body: form });
  if (error) throw error;
  if (!data?.image) throw new Error(data?.message ?? 'Image processing failed.');
  return data.image as ProductImageAsset;
};

export const optimizeExistingProductImage = async (asset: ProductImageAsset, productId: string) => {
  if (!supabase) throw new Error('Supabase is not configured.');
  const response = await fetch(asset.originalUrl);
  if (!response.ok) throw new Error('Could not load the existing original photo.');
  const blob = await response.blob();
  const file = new File([blob], 'existing-photo', { type: blob.type });
  const { variants } = await createImageVariants(file);
  const form = new FormData();
  form.set('action', 'variants'); form.set('productId', productId);
  form.set('imageId', asset.id); form.set('original', file);
  for (const [name, variant] of Object.entries(variants)) if (variant) form.set(name, variant, `${name}.webp`);
  const { data, error } = await supabase.functions.invoke('manage-product-image', { body: form });
  if (error) throw error;
  if (!data?.image) throw new Error(data?.message ?? 'Image optimization failed.');
  return data.image as ProductImageAsset;
};

export const cleanupProductVariants = async (paths: string[]) => {
  if (!supabase || !paths.length) return;
  const form = new FormData();
  form.set('action', 'cleanup'); form.set('paths', JSON.stringify(paths));
  const { error } = await supabase.functions.invoke('manage-product-image', { body: form });
  if (error) throw error;
};
