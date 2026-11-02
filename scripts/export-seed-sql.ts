import { FEATURED_PRODUCTS } from '../src/constants/products';
const sqlString = (value: string) => `'${value.replaceAll("'", "''")}'`;
const rows = FEATURED_PRODUCTS.map((product, index) => `(${[
  sqlString(product.id), sqlString(product.sku), sqlString(product.slug), sqlString(product.name),
  product.price, 50, product.stock, sqlString(product.category), 'true', 'true',
  sqlString(product.description), sqlString(product.shortDescription),
  `${sqlString(JSON.stringify(product.images))}::jsonb`, `${sqlString(JSON.stringify(product.notes))}::jsonb`, index,
].join(', ')})`);
console.log(`insert into public.products (id,sku,slug,name,price,size_ml,stock,category,active,featured,description,short_description,images,notes,sort_order) values\n${rows.join(',\n')}\non conflict (id) do nothing;`);
