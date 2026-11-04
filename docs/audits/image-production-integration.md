# Dotfumes production image integration (local review)

## Decision and provenance

- Inspected the supplied ZIP, its review page, 210 manifest outputs, category contact sheets, 44 current website sources, and the current React/Supabase image pipeline.
- Verified SHA-256 for all 210 generated outputs and confirmed that all 44 corresponding website source files exactly match the package's source checksums.
- Selected 71 variants from 35 original URLs: 12 front, 12 angled, 14 flat-lay, 19 lifestyle, and 14 collection images. The other 139 generated outputs were not imported.
- A selected file has passed the package's technical QA, keeps the original aspect and subject, is not upscaled or cropped, and is at least 10% smaller than its unchanged source file. The 71 selected files total 3,751,506 bytes. Exact source, destination, dimensions, byte counts, SKU/product mapping, checksums, and selection reason are in [image-production-selection.csv](image-production-selection.csv).
- The package's mobile hero canvases are letterboxed previews, so the current mobile composition remains. Hero and About derivatives from this package are generally larger than the already efficient site assets, so current site assets remain. Brand/logo variants have no useful size gain for current placements.
- The 44 existing website assets and the supplied ZIP have not been modified or deleted. The complete 210-output package remains outside the website repository for future review.

## Integration

```text
public/images/products/                 unchanged original local photos
public/images/collections/              unchanged original local group photos
public/images/hero/                     unchanged current masters and existing responsive files
public/images/derivatives/products/     selected local product variants by product slug
public/images/derivatives/collections/  selected local collection variants
src/constants/localImageVariants.ts     central URL-to-variant registry
src/lib/productImages.ts                selection with admin and legacy precedence
```

Administrator-managed Supabase variants take first priority. The local registry is consulted only when an exact original local URL has a selected derivative and no corresponding admin variant exists. Existing product image URLs remain the stable source identity, including product-specific social previews. The website does not require a database migration or Storage operation for these local derivatives.

The unchanged original URL remains the high-resolution choice. Browser `srcSet` and `sizes` choose a smaller verified variant where the rendered width and device pixel ratio warrant one. A variant that would transfer more bytes than its original was not imported. Separate CSS-only resizing does not determine delivery.

## Visual inspection

Opened the offline `review.html` in Chrome with external network disabled; all 420 comparison image elements loaded. Inspected product fronts, collection groups, dark Wild Silence scenes, and mobile hero comparisons. Selected files preserve their full original framing and label character; an existing cover-style page placement may still crop the displayed frame. Wild Silence's dark lifestyle label contrast is inherited from the source and remains a visual limitation. The supplied package marks all outputs as requiring final brand review; this integration does not claim independent owner approval.

Representative screenshots: [mobile home](image-integration-screenshots/home-320.png), [mobile collection](image-integration-screenshots/collection-390.png), [mobile Bold Decision PDP](image-integration-screenshots/product-bold-decision-390.png), [mobile Wild Silence PDP](image-integration-screenshots/dotfumes-wild-silence-mobile.png), [desktop About](image-integration-screenshots/about-1440.png).

## Local browser QA

Chrome measured `/`, `/collection`, `/product/bold-decision`, and `/about` at widths 320, 375, 390, 430, 768, 1024, 1280, 1440, and 1920 px: 36 page/viewport combinations, zero failed image responses and zero duplicate image requests in the measured sessions. All five product main images resolved to the correct product at 390 and 1440 px. Checkout selected the 160-pixel Bold Decision variant; the cart reused the already downloaded original from the preceding product page, and a focused request trace confirmed no new product-image request when opening the cart. This is a local browser check, not a production benchmark.

Image response bytes from the same measurement script, before versus after, include all images requested during the brief page session:

All 36 rows, including LCP, CLS, and duplicate-request counts, are in [image-integration-metrics.csv](image-integration-metrics.csv).

| Page | Width | Before | After | Change |
| --- | ---: | ---: | ---: | ---: |
| Home | 320 | 610,580 | 585,790 | -24,790 |
| Home | 1440 | 761,478 | 666,190 | -95,288 |
| Collection | 320 | 215,510 | 166,950 | -48,560 |
| Collection | 1440 | 371,886 | 265,162 | -106,724 |
| Bold Decision PDP | 320 | 556,604 | 319,962 | -236,642 |
| Bold Decision PDP | 1440 | 556,604 | 577,922 | +21,318 |
| About | 320 | 53,066 | 53,066 | 0 |

The 1440-pixel PDP increase is retained as an observed regression, not hidden. It comes from the combined requests in this short session; a deeper trace is required before attributing it to a particular file. LCP measurements vary with local/network conditions and are not used as proof of improvement. Maximum observed CLS across the 36 samples was below 0.018.

## Safety, rollback, and remaining limits

- No Supabase schema, Storage, Edge Function, product pricing, stock, order, payment, authentication, or checkout submission changes.
- No existing masters were overwritten. Rollback requires removing the new local derivative registry/assets and reverting only the frontend references from this task; existing URLs continue to work.
- Supabase administrator upload/save/replace was not exercised with a signed-in admin in this pass. Existing admin precedence is unit tested, but a real authenticated browser check remains necessary before asserting that workflow fully verified.
- The site still lacks dedicated portrait mobile campaign photography. Existing mobile hero treatment is kept rather than using the package's dark-margin preview canvases.
- The collection hero remains a landscape group photograph inside a tall mobile cover area. At 390 px the two edge bottles are partially outside the crop; a suitable portrait group composition is needed to show all five there without making the campaign image very small. The complete five-bottle lineup is visible in the separate family section below.
- Original 1122-pixel product files cannot supply genuine detail beyond their native resolution. Tiny thumbnail labels are paired with product-name text; they are not guaranteed readable by themselves.

## Changed source and checks

- `src/constants/localImageVariants.ts`: local selected-variant registry generated from the verified manifest.
- `src/constants/images.ts`: explicit curated editorial image URLs instead of product-array positions.
- `src/lib/productImages.ts`: Supabase-first selection with local and legacy fallbacks.
- `src/components/AssetImage.tsx`: native responsive source selection and intrinsic dimensions for local assets.
- `src/components/home/BrandStory.tsx`, `CategorySplit.tsx`, `SignatureExperience.tsx`: evidence-based responsive sizes for editorial/collection photography.
- `src/components/home/Hero.tsx`: preload the same mobile or responsive desktop asset the visible slide will use.
- `src/pages/CollectionPage.tsx`: responsive family-lineup sizes.
- `tests/imagePipeline.test.ts`: local-variant, admin-precedence, and legacy-record coverage.

Checks: `npm run lint` passed, seven Node image-pipeline tests passed, the existing real-Chrome image-processing test passed, and `npx vite build` passed. The repository's broader `npm run build` wrapper remains blocked by its pre-existing missing local `.agents/kernel/engine.ts`; Netlify's configured production command is `npx vite build`.
