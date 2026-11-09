# FLS visual assets

Created 9 November 2026 with the built-in `image_gen` tool (not the CLI/API fallback).

- Generated asset: `public/brand/fls-icon-atlas.png` — 1254 × 1254 RGBA,
  containing 25 blue/green pictograms on a transparent background.
- User-supplied source: `public/brand/fls-logo-source.jpg`, copied unchanged from
  `D:/projects/webApp/FLS TRANSPORT CO., LTD..jpg`.
- `components/shared/BrandIcon.tsx` renders individual pictograms with measured CSS
  viewports. The generated atlas is kept intact; no image resampling or editing
  script is required. Shared loading and dialog-close controls also use this asset.
- `components/layout/FlsBrand.tsx` displays only the supplied globe symbol through
  a 36px CSS viewport. The image itself is unchanged. Visible text is FLS Transport /
  Phone assets; the full company name is available in the tooltip. The source's
  TRADING lettering and slogan are outside the viewport, not rewritten.
- The new asset set covers the active `/preview` inventory workflow, its popups,
  directory, import, issue, return and exchange screens. Archived legacy screens
  retain their existing icons.
- The atlas loads once and is shared through the browser cache. Visible text and
  accessible button names describe actions independently of the decorative images.

## Final generation prompt

```text
Create ONE production UI icon sprite atlas asset, square canvas, exact uniform 5 columns by 5 rows grid, all 25 cells equal square sizes, each icon centered precisely in its own cell, generous consistent transparent separation, no frames, no visible grid, no text, no letters, no numbers, no logo, no watermark. This atlas will be used as CSS background sprites in a real FLS transport company phone asset management app. Style: refined modern flat duotone pictograms, strong clear silhouettes, gently rounded corners, blue #006CB3 with emerald green #00B76A secondary accents, occasional pale blue/teal fills, consistent visual weight, no photorealism, no 3D, no tiny fussy details, no drop shadows, fully transparent background. Each glyph occupies approximately 82 percent of its cell and must remain recognizable at 24 CSS pixels. EXACT row-major ordered contents: ROW 1: (1) inventory clipboard with three clear checklist lines and tiny phone; (2) site map pin with small building inside; (3) transfer phone pointing outbound toward a site, right arrow; (4) receipt circle with large checkmark; (5) smartphone silhouette with blank blue screen and tiny green lower indicator. ROW 2: (6) return phone with curved left return arrow; (7) exchange two opposing horizontal arrows with small phone; (8) transaction history clock with counterclockwise circular arrow; (9) policy document with folded corner and short lines; (10) people two simple head-and-shoulder silhouettes. ROW 3: (11) search magnifying glass; (12) information circle with dot and stem; (13) single strong green checkmark; (14) strong left arrow; (15) strong right arrow. ROW 4: (16) edit pencil; (17) delete wastebasket; (18) add plus; (19) home house; (20) spreadsheet page with grid. ROW 5: (21) upload upward arrow into tray; (22) shield with checkmark; (23) right chevron; (24) loading circular incomplete ring, simple smooth blue ring with one gap; (25) phone accessory kit showing charging plug and USB cable. Preserve exact grid alignment. This is a single sprite atlas, not a UI screen, not an icon presentation board. No background color.
```
