# Dotfumes image and asset audit

Audit date: 4 November 2026. Scope: repository image assets, source references, and route logic. This is an audit only; no production code, product data, or Supabase Storage was changed.

## A. Executive summary

The local image library is small and technically healthy: **44 readable WebP files, 5,160,958 bytes (4.92 MiB), with no byte-identical duplicates or missing local paths**. The five product front photographs share a coherent centered, white-background presentation. The main risks are delivery and coverage: no responsive source variants, no `srcSet` or `<picture>`, no intrinsic image dimensions in rendered markup, hardcoded homepage editorial imagery that does not follow admin product updates, and unknown quality/size of live Supabase uploads. The same 2560 × 1440 hero file is cropped for mobile; the result at the requested viewports remains unverified. No image replacement is justified by the available visual evidence.

## B. Asset statistics and counting method

| Measure | Result | Basis |
|---|---:|---|
| Unique repository image files | 44 | Scan of image extensions in `public/` and `src/`; SHA-256 for duplicates |
| Total file bytes | 5,160,958 (4.92 MiB) | File sizes, not network transfer |
| Formats | 44 WebP | Actual decoded MIME, not extension alone |
| By directory | 25 product, 11 collection, 7 hero, 1 logo | Physical paths |
| Exact duplicate files | 0 | SHA-256 comparison |
| Missing or corrupt local files | 0 | Filename matching and image decoder |
| Literal local image filename references | 44 | Each local filename occurs once in source/HTML; this is **not** the number of runtime render events |
| Unreferenced local files | 0 | Literal source/HTML filename scan |
| Route-reachable local images | 36 | 25 product images, 7 hero images, 4 collection images; includes two error-only fallback images |
| Potentially rendered without error fallback | 35 | Route-reachable 36 minus family-mood fallback; conditional route/product display still applies |
| Not rendered as website image | 8 | Seven collection constants have no component consumer; logo is used as OG metadata only |

**Counting qualification:** the five home hero fallback assets are already among the 25 product images. The family-mood asset is used only after an About/Collection hero error. Thus 35 distinct assets can appear in normal route use (25 product + 7 hero + 3 collection), and **36** can appear when fallback states are included. The logo is referenced by `index.html` as `og:image`, but is not rendered on a page. All 44 have one literal filename reference; repeated runtime use through product fields is not represented by that count. Live Supabase Storage objects are outside this local inventory and their number/bytes are **NOT VERIFIED**.

The complete per-file metadata is in [CSV](image-asset-inventory.csv) and [JSON](image-asset-inventory.json). The CSV includes full repository path, extension, decoded MIME, dimensions, aspect ratio, bytes, color mode, alpha, animation, hash, and reference location. WebP encoder quality is **NOT VERIFIED**; it cannot be reliably inferred from final file size.

## C. Asset inventory and visual classification

All 44 files decode as static WebP, RGB, without alpha. Product bottle images: 14 at 1122 × 1402; six square assets at 1254 × 1254; five product landscape assets at 1672 × 941. Hero assets: six at 2560 × 1440 and one About portrait at 1800 × 2400. All 11 collection assets are 1672 × 941. See inventory for each individual file and its byte count.

**Visual sample inspected:** all 25 product images and all 11 collection images were viewed in grouped contact sheets. Main bottle fronts, angles, and flat-lays: **Good** for consistent framing and product visibility; suitability at every rendered breakpoint is unverified. Wild Silence's dark forest and volcanic lifestyle scenes: **Needs review**, because bottle/label contrast is lower than in the other lifestyle images. The other lifestyle images have coherent mood-led art direction and recognizable bottles: **Good in contact-sheet review**. Collection images show consistent product colors and a deliberate split between white catalog and dark editorial treatments. Hero and logo photographic quality were not all inspected at full resolution, so their per-file visual grade is **NOT VERIFIED**; metadata is not a photographic-quality test. None is classified as Broken. No image is confirmed Poor or in need of replacement.

### Product-by-product photography

| Product | Front bottle | Lifestyle/contact-sheet observation | Decision |
|---|---|---|---|
| Bold Decision | Centered, uncropped, matching scale | Dark walnut and ingredient scenes, recognizable bottle | Good in inspected sample |
| Soft Promise | Centered, uncropped, matching scale | Softer pink/floral mood; coherent with fragrance positioning | Good in inspected sample |
| Wild Silence | Centered, uncropped, matching scale | Forest/volcanic scene has lower bottle-label contrast | Review at rendered size; no replacement decision |
| Bleu Heat | Centered, uncropped, matching scale | Athletic/wood scenes, recognizable bottle | Good in inspected sample |
| First Meet | Centered, uncropped, matching scale | Golden/tropical scenes, recognizable bottle | Good in inspected sample |

## D. Images by website section

| Route/section | Actual source and component | CSS display/crop | Observation |
|---|---|---|---|
| Home hero | Five `public/images/hero/dotfumes-home-hero-*.webp`, `src/components/home/Hero.tsx:31-122,230-258` | Full viewport, `object-cover`; slide-specific positions; same source on mobile/desktop | First slide eager/high priority; 2560-wide source also serves narrow mobile |
| Home featured cards | Dynamic product `images.front`, `src/components/home/ProductCard.tsx:62-76` | Square card, image inside 80% frame, `object-contain` | Bottle not cropped by CSS; Supabase originals may be up to 5 MB |
| Home editorial | Fixed fallback-catalog lifestyle images in `BrandStory.tsx:32`, `SignatureExperience.tsx:15-31`; duo constants in `CategorySplit.tsx:98-106` | 2:3, 3:4, or 60/80vh blocks, `object-cover` | Admin updates to product photos do not update fixed editorial imagery |
| Collection | Hero, family lineup, cards, `CollectionPage.tsx:30-51,85-90,133-144` | Hero ≥72vh `object-cover`; lineup 16:9 `object-contain`; cards square `object-contain` | Hero has family-mood fallback; category cards use dynamic fronts |
| Product detail | Product gallery and editorial, `ProductPage.tsx:105-156,255-285` | Main 56–70vh `object-contain`; thumbnails 56/64px; editorial `object-cover` | All product photos enter gallery; only lifestyle indices 0 and 1 enter lower editorial sections |
| Cart drawer/cart | `CartLineItem.tsx:95-100,177-182` | Small contained front image | Original full-size image requested |
| Checkout | `CheckoutPage.tsx:604-610` | Contained product front; separate payment-slip preview uses object-cover | Dynamic front image; payment slip is user data, not a catalog asset |
| Confirmation | `OrderConfirmationPage.tsx:306-312` | Dynamic front image and optional receipt preview | Receipt preview may be absent after reload; unrelated to product asset integrity |
| About | Portrait hero, `AboutPage.tsx:11-12,45-51` | ≥70vh, `object-cover` | Family mood fallback on error |
| Navbar/footer | No repository raster image rendered | Text and Lucide icons | Logo file exists only in OG metadata |
| Admin | `SupabaseAdminPage.tsx:283`, `StudioProductEditor.tsx:22-74` | 64–72px list thumbs; square contained editor thumbs | Upload accepts original JPG/PNG/WebP ≤5 MB; no resizing/variant generation |

**Rendered dimensions:** the source provides CSS constraints above, but exact desktop/tablet/mobile pixel dimensions depend on viewport height and layout. Browser screenshots and actual computed dimensions at 320, 375, 390, 430, 768, 1024, 1280, 1440, and 1920px were **NOT VERIFIED**. Consequently, no crop failure or measured layout shift is claimed. The product card/main gallery `object-contain` rules do preserve the full image by design; `object-cover` sections may crop edges.

## E–F. Photography and responsive assessment

The main bottle fronts establish a consistent scale, placement, lighting, and white background. Distinct fragrance colors appear intentional. The lifestyle collection varies mood deliberately; its exact color accuracy and label detail cannot be judged from contact sheets. **Wild Silence is the only specific readability review candidate**, not a confirmed replacement. The hero design has per-slide `objectPosition`, but no separate portrait source. `Hero.tsx:230-258` renders the same landscape URL into mobile and desktop `<img>` nodes. The browser may avoid fetching a `display:none` node; duplicate downloads are **not confirmed**. Mobile composition and exact text-safe crop require the requested browser viewport checks.

## G. Delivery and performance

- `AssetImage.tsx:24,43-53` defaults below-fold images to lazy loading and uses async decoding. High-priority hero/product/collection/about images are eager through `fetchPriority="high"`; first home hero also has explicit eager/high in `Hero.tsx:237-255`.
- No local responsive `srcSet`, `<picture>`, or width-descriptor image variants were found in `src/`. `sizes="100vw"` on the home hero supplies no selection benefit without `srcSet` (`Hero.tsx:240,257`). This is the most concrete cross-device transfer inefficiency.
- `supabaseCatalog.ts:82-92` uploads original JPG/PNG/WebP bytes, up to 5 MB, and returns a public Storage URL. The same `front` URL is reused for full product view, cards, cart, checkout, and admin thumbnails. A 5 MB upload could therefore be downloaded for a small thumbnail; **this is a risk, not a measured live occurrence**.
- Image elements lack explicit `width`/`height` attributes. Many wrappers reserve space with aspect ratios or fixed heights, so actual CLS impact is **NOT VERIFIED**.
- Source sizes and network savings from conversion are not benchmarked. Repository assets are already WebP and total only 4.92 MiB; the largest potential unknown is live uploaded originals. AVIF may be evaluated, but no measured savings are claimed.
- Caching headers/CDN behavior, LCP element and timing, external URL status, and Supabase transformation availability are **NOT VERIFIED**.

This follows [web.dev responsive image guidance](https://web.dev/learn/images/responsive-images) on `srcSet`/`sizes` and art-directed `<picture>`, and [web.dev image performance guidance](https://web.dev/learn/performance/image-performance) on serving appropriately sized sources.

## H. SEO and accessibility

- Meaningful product images generally have product-based alt text in cards and detail pages. Gallery thumbnails have `alt=""` inside buttons with `aria-label="View product photo N"` (`ProductPage.tsx:154-157`); the buttons are named, though the label is generic. Admin list thumbnail is decorative with empty alt.
- Product main image alt text is generic numbering rather than view/mood description (`ProductPage.tsx:149`). Some fallback alt text can be inaccurate: flat-lay section uses `front` when flat-lay missing but still says top-down (`ProductPage.tsx:276-279`).
- Product JSON-LD includes all product image URLs (`ProductPage.tsx:53-62`), but `index.html:18` fixes OG image to the logo, and `usePageMeta.ts` has no per-product OG image update. Search/social appearance of client-rendered metadata requires crawler verification.
- Static filenames are descriptive. Admin uploads receive UUID filenames (`supabaseCatalog.ts:88-92`); their descriptive context comes from product metadata/alt rather than URL.
- Product image URLs are only checked as strings in `parseProduct` (`supabaseCatalog.ts:29-42`); broken remote references remain possible. No remote URL health check was performed.

## I. Proposed Dotfumes image specification

These are **recommendations**, derived from the CSS container rules above. Native resolution is the file's pixel grid; rendered size is the CSS box in the browser. At 2× device pixel ratio a 400 CSS-pixel box benefits from roughly 800 source pixels. Actual box widths and the choice of 3× variants should be confirmed with browser measurements before adoption.

| Category | Composition / ratio | Suggested source variants (1× / 2× use) | Target per delivered variant | Format / crop |
|---|---|---|---|---|
| Bottle front/card | 4:5 original, placed contained in square card | 480w, 800w, 1200w | ~50–180 KB | WebP baseline; AVIF only if tested; keep full bottle and white margin |
| Product main/gallery | 4:5 bottle, optional 1:1 close-up | 800w, 1200w, 1600w | ~100–300 KB | WebP; `object-contain`; never crop bottle/label |
| Gallery/cart/checkout thumbnail | 1:1 contained bottle | 160w, 320w, 480w | ~15–70 KB | WebP; square canvas or contained 4:5 original |
| Home/collection desktop hero | Existing 16:9, text-safe left | 1440w, 1920w, 2560w | ~180–450 KB | WebP; `object-cover`; validate subject at each width |
| Home mobile hero | Portrait composition if crop fails | 640w, 900w, 1200w | ~100–280 KB | Separate art-directed WebP if needed; test 320–430px widths |
| About portrait hero | Existing 3:4 | 720w, 1200w, 1800w | ~120–350 KB | WebP; check portrait-to-container crop |
| Editorial lifestyle / duo | 4:5 or current 16:9 as section requires | 720w, 1200w, 1672w | ~100–300 KB | WebP; choose crop per actual section; avoid bottle under text |
| Collection family lineup | Existing 16:9 contained | 800w, 1200w, 1672w | ~100–250 KB | WebP; preserve all five bottles |

File-size targets are editorial budgets, **not measured achievable compression results**. Compress from preserved originals at quality selected by side-by-side review; avoid recompressing the only WebP master. Provide 1× and 2× choices where the actual rendered width and device DPR justify them. Consider AVIF with WebP fallback only after compatibility and visual checks. Separate mobile hero art is justified only if the actual mobile crop obscures subject or copy; that is not yet verified. See [web.dev Learn Images](https://web.dev/learn/images/) for format and workflow principles.

## J. Prioritized issue register

| ID | Priority | Evidence / route | Customer impact | Recommended correction for next phase | Risk |
|---|---|---|---|---|---|
| IMG-01 | P1 | `supabaseCatalog.ts:82-92`; `ProductCard.tsx:73`; cart/checkout front reuse | Up to 5 MB original may load into small slots | Measure live files; create size variants and select by use | Medium |
| IMG-02 | P1 | `Hero.tsx:230-258` | Landscape hero may lose subject/text-safe framing on 320–430px | Screenshot all mobile widths; art-direct if crop fails | Medium |
| IMG-03 | P1 | `AssetImage.tsx:43-53`; no `srcSet` in `src/` | Unnecessary mobile transfer from fixed original | Introduce measured responsive variants and `srcSet`/`sizes` | Medium |
| IMG-04 | P2 | `BrandStory.tsx:32`, `SignatureExperience.tsx:15-31` | Admin photo updates do not propagate to homepage editorial | Decide if editorial is intentionally curated or catalog-driven | Medium |
| IMG-05 | P2 | `ProductPage.tsx:276-279` | Front bottle can be described as flat-lay after fallback | Make alt conditional on actual source | Low |
| IMG-06 | P2 | `index.html:18`, `usePageMeta.ts` | Shared product pages may show logo instead of product photo | Add product-specific social image metadata with crawler test | Medium |
| IMG-07 | P2 | `ProductPage.tsx:255-285`; uploaded extra images | More than two lifestyle photos appear only in gallery | Decide expected editorial placement with merchant | Low |
| IMG-08 | P2 | Wild Silence lifestyle contact-sheet review; `ProductPage.tsx:255-285` | Bottle/label may be hard to read in dark blocks | Check actual desktop/mobile render before replacing | Low |
| IMG-09 | P2 | `<img>` markup across `src/` lacks intrinsic dimensions | Possible layout instability where wrapper does not reserve size | Measure CLS and add intrinsic aspect metadata where needed | Low |
| IMG-10 | P3 | `ProductPage.tsx:149,154-157` | Generic photo numbering gives limited image context | Use accurate view-specific descriptions | Low |

No P0 broken imagery was confirmed. IMG-02, IMG-08, and IMG-09 are **risks requiring rendered verification**, not proven visual failures. Proposed corrections are for planning only; none was implemented.

## Verification limits

There was no controllable browser surface available for screenshots. Rendered size, crop, sharpness, LCP, CLS, network transfer and cache behavior were **NOT VERIFIED** at 320, 375, 390, 430, 768, 1024, 1280, 1440, or 1920px. Live Supabase Storage could not be inventoried without accessing production objects; this audit did not alter Storage. External product URL health is unknown. The photographic assessment is based on contact sheets of 36 product/collection assets, not calibrated full-resolution viewing of every asset. No image is marked for replacement on that limited evidence.
