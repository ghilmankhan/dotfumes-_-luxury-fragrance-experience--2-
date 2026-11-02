import type { Product } from '../models/types';
import { supabase } from './supabase';

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
  return products as Product[];
};

export const saveSupabaseProduct = async (product: ProductInput) => {
  if (!supabase) throw new Error('Supabase is not configured.');
  const { error } = await supabase.from('products').upsert({
    id: product.id, sku: product.sku.trim(), slug: product.slug.trim(), name: product.name.trim(),
    price: product.price, stock: product.stock, size_ml: product.sizeMl ?? null, category: product.category, active: product.active,
    featured: product.featured ?? false, sort_order: product.sortOrder ?? 100,
    description: product.description.trim(), short_description: product.shortDescription.trim(),
    images: product.images, notes: product.notes,
  });
  if (error) throw error;
};

export const archiveSupabaseProduct = async (id: string) => {
  if (!supabase) throw new Error('Supabase is not configured.');
  const { error } = await supabase.from('products').update({ active: false }).eq('id', id);
  if (error) throw error;
};

export const uploadProductImage = async (file: File, productId: string) => {
  if (!supabase) throw new Error('Supabase is not configured.');
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 5 * 1024 * 1024 || file.size === 0) {
    throw new Error('Upload a JPG, PNG, or WEBP image under 5 MB.');
  }
  const extension = file.type === 'image/jpeg' ? 'jpg' : file.type === 'image/png' ? 'png' : 'webp';
  const path = `${productId}/${crypto.randomUUID()}.${extension}`;
  const { error } = await supabase.storage.from('product-images').upload(path, file, { contentType: file.type });
  if (error) throw error;
  return supabase.storage.from('product-images').getPublicUrl(path).data.publicUrl;
};
