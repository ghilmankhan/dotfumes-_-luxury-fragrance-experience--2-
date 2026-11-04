# Dotfumes image optimization roadmap

Planning document only. No implementation is authorized by this audit. Evidence and priority IDs are in [the main report](DOTFUMES_IMAGE_ASSET_AUDIT.md).

## 1. Immediate checks before changing images

1. Capture the actual home hero, collection, product, cart, and checkout at 320, 375, 390, 430, 768, 1024, 1280, 1440, and 1920px. Record computed image boxes, crops, LCP element, and any CLS. This resolves IMG-02 and IMG-09 without guessing.
2. Inspect the two Wild Silence lifestyle images at their real product-page sizes. Replace only if the bottle/label is truly unreadable (IMG-08).
3. Inventory currently active Supabase product-image objects and their byte size/dimensions through read-only access. Check URLs and identify originals exceeding their displayed needs (IMG-01).
4. Decide whether homepage editorial imagery should remain a curated, fixed campaign or follow admin product image changes (IMG-04).

## 2. Compression and format conversion

1. Preserve original masters. Build visual comparisons before recompressing the existing WebPs.
2. Target the largest measured over-sized assets first. The repository is only 4.92 MiB in total; live uploads may be more important.
3. Evaluate AVIF with WebP fallback only when measured savings and visual quality justify another format. Do not force conversion of already-small assets.

## 3. Responsive delivery pipeline

1. Produce content-specific width variants for hero, product main, card, and thumbnail contexts based on measured CSS dimensions and 1×/2× DPR.
2. Use `srcSet` plus accurate `sizes` for ordinary responsive selection. Consider `<picture>` for mobile hero art direction if screenshots confirm the landscape crop fails.
3. Ensure admin-uploaded originals are transformed/served at thumbnail and card sizes, while keeping the original or a high-resolution variant for product detail. Verify Supabase Storage transformation availability and cost before choosing the mechanism.
4. Add intrinsic width/height or aspect metadata to image rendering where measurements show unstable layout.

## 4. Photography decisions

1. No replacement has been approved by this audit.
2. Review Wild Silence's two dark lifestyle frames at display size; adjust/re-shoot only if product readability fails.
3. Shoot a separate portrait hero only if 320–430px screenshots show the bottle or text-safe composition being lost.
4. Keep branded bottle identity and color accurate; do not substitute stock or AI-generated bottles.

## 5. Long-term asset management

1. Record primary versus gallery versus editorial purpose in admin content guidance; extra lifestyle uploads currently show in the gallery but only indices 0–1 occupy editorial panels.
2. Add lightweight checks for file MIME, dimensions, size, and image URL health when content is added, with useful failure messages.
3. Revisit product-specific Open Graph images and accurate view-specific alt text (IMG-05, IMG-06, IMG-10).
4. Keep the inventory script and CSV/JSON as a repeatable local-asset baseline; audit Supabase objects separately.
