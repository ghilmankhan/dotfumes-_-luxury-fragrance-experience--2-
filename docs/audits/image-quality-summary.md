# Dotfumes image quality summary

Audit only, 4 November 2026. See [full report](DOTFUMES_IMAGE_ASSET_AUDIT.md) and [per-file inventory](image-asset-inventory.csv).

| Group | Count | Contact-sheet finding | Quality decision |
|---|---:|---|---|
| Product bottle fronts | 5 | All five centered and fully visible; white background and comparable scale | Good in inspected sample |
| Product three-quarter angles | 5 | Bottle color and labels match corresponding fronts; no obvious crop | Good in inspected sample |
| Product flat-lays | 5 | Bottle color and labels match corresponding fronts; no obvious crop | Good in inspected sample |
| Product lifestyle | 10 | Coherent product-specific moods, bottle generally recognizable | Eight good; two Wild Silence images need rendered-size readability review |
| Collections | 11 | Group bottles/colors appear internally consistent; white catalog and dark editorial treatments are intentional | Good in contact-sheet review |
| Heroes | 7 | Native dimensions verified; composition at browser sizes not verified | Visual classification NOT VERIFIED |
| Logo | 1 | Used in OG metadata; not page-rendered | Visual classification NOT VERIFIED |

No local image was corrupt, and no image replacement is confirmed. Wild Silence's two dark lifestyle images are the first candidates for a close viewing at real product-page size, because the transparent bottle labels have less contrast in the contact sheet. The mobile hero crop is a code-supported risk, not a confirmed visual defect. Supabase-uploaded product photos were not inventoried and may differ from the local fallback catalog.

The inventory's per-file `display_suitability` column remains **REQUIRES VISUAL/LAYOUT REVIEW**, because contact sheets cannot establish sharpness or crop at each actual responsive size. The report's group-level judgments should not be read as a per-file production approval.
