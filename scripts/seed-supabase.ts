import { createClient } from '@supabase/supabase-js';
import { FEATURED_PRODUCTS } from '../src/constants/products';

const url = process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.');
const client = createClient(url, serviceKey, { auth: { persistSession: false } });
const rows = FEATURED_PRODUCTS.map((product, index) => ({
  id: product.id, sku: product.sku, slug: product.slug, name: product.name,
  price: product.price, stock: product.stock, size_ml: 50, category: product.category,
  active: product.active ?? true, featured: true, description: product.description,
  short_description: product.shortDescription, images: product.images, notes: product.notes,
  sort_order: index,
}));
const { error } = await client.from('products').upsert(rows, { onConflict: 'id' });
if (error) throw error;
console.log(`Seeded ${rows.length} current Dotfumes products.`);
