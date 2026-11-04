const escapeAttribute = (value) => String(value).replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');

export default async (request, context) => {
  if (request.method !== 'GET') return;
  const slug = new URL(request.url).pathname.match(/^\/product\/([a-z0-9]+(?:-[a-z0-9]+)*)\/?$/)?.[1];
  if (!slug) return;
  const endpoint = Netlify.env.get('VITE_SUPABASE_URL');
  const key = Netlify.env.get('VITE_SUPABASE_PUBLISHABLE_KEY');
  if (!endpoint || !key) {
    console.warn('product-social: public catalog configuration unavailable');
    return;
  }
  try {
    const lookup = new URL('/rest/v1/products', endpoint);
    lookup.searchParams.set('select', 'name,description,images');
    lookup.searchParams.set('slug', `eq.${slug}`);
    lookup.searchParams.set('active', 'eq.true');
    lookup.searchParams.set('limit', '1');
    const catalog = await fetch(lookup, { headers: { apikey: key, Authorization: `Bearer ${key}` } });
    if (!catalog.ok) {
      console.warn('product-social: catalog lookup failed', catalog.status);
      return;
    }
    const product = (await catalog.json())[0];
    if (!product?.images?.front) {
      console.warn('product-social: product image unavailable');
      return;
    }
    const response = await context.next();
    if (!response.ok || !response.headers.get('content-type')?.includes('text/html')) return response;
    const image = escapeAttribute(new URL(product.images.front, request.url).href);
    const title = escapeAttribute(`${product.name} | DOTFUMES`);
    const description = escapeAttribute(product.description || 'Explore this DOTFUMES fragrance.');
    let html = await response.text();
    html = html.replace(/<meta property="og:image" content="[^"]*"\s*\/>/, `<meta property="og:image" content="${image}" />`);
    html = html.replace(/<meta property="og:title" content="[^"]*"\s*\/>/, `<meta property="og:title" content="${title}" />`);
    html = html.replace(/<meta property="og:description"[\s\S]*?\/>/, `<meta property="og:description" content="${description}" />`);
    html = html.replace('</head>', `<meta name="twitter:image" content="${image}" /><meta property="og:url" content="${escapeAttribute(request.url)}" /></head>`);
    const headers = new Headers(response.headers);
    headers.delete('content-length');
    headers.delete('content-encoding');
    return new Response(html, { status: response.status, statusText: response.statusText, headers });
  } catch (error) {
    console.warn('product-social: metadata lookup failed', error instanceof Error ? error.name : 'unknown');
    return;
  }
};
