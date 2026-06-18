source visual truth path: user screenshots in the thread, plus local HeroUI and tweakcn open-source references cloned under work/reference-heroui and work/reference-tweakcn.
implementation target: http://localhost:3000, http://localhost:3000/editor, http://localhost:3000/playground
viewport: 1280x720 browser viewport during final checks
state: editor default CSV, line template, area template, metric-card template, donut template, rose template

full-view comparison evidence:
- Editor is Chinese and keeps the functional workflow visible: data input, real-time preview/export, and template/API configuration.
- At 1280px, the editor uses a two-column functional layout so the preview is not squeezed by the configuration panel.
- At larger desktop widths, the app keeps the denser HeroUI-style dashboard/editor structure.
- Real-time preview and export render from the exact same SVG string; browser DOM checks returned sameOuterHtml: true for donut, rose, and line templates.

focused region comparison evidence:
- Line chart now uses normalized SVG pathLength animation, so the full curve is connected after the draw animation instead of stopping halfway.
- Donut and rose charts now use part-to-whole field mapping that prefers the category field over the date field.
- Donut and rose charts aggregate repeated category labels before rendering, so channel composition is not split into repeated month petals/slices.
- Donut renders as a composition card with a left ring and right-side label/value/percent list.
- Rose renders as a channel-composition rose with subtle guide rings, compact labels, and radial petals rather than a debug-like star.
- Rose renderer was corrected again to match a true Nightingale rose shape: fixed-angle annular sectors, circular outer arcs, a small center hole, no radar-style guide rings, and no spike/triangle petals.
- Rose sectors now use the expanded sector as the base SVG state, so static PNG/WebP/JPEG exports show the finished rose instead of a blank collapsed animation frame.
- Default data now supports both monthly trends and channel composition.
- Card metadata now adapts to missing optional fields: empty periodLabel removes the period pill, incomplete metrics are skipped, and empty trend removes the trend arrow/text instead of defaulting to up.
- The period pill is now a plain configured label, not a dropdown-looking control; no chevron path is rendered.
- Customer docs now include card usage rules for periodLabel, metrics, prefix/suffix, delta/trend, and omitted card behavior.
- HeroUI references used: dashboard composition, KPI/TrendChip semantics, chart card rhythm, and plain rounded period pill styling.
- tweakcn references used: Chart 1-5 color token preview rows, compact theme/component preview grouping, hover-copy color affordance, and functional card spacing.
- Area is now a dedicated renderer instead of a line fallback. It draws one or two smooth area series from real x/y/series data, and falls back to a single aggregated area if the series field is sparse.
- Metric-card now uses real data: primary value comes from card.metrics[0] or the first row, secondary metrics render only when supplied, and spark bars use data.rows instead of generated sine values.
- Metric-card field recommendation now prefers date as the spark axis before category fields, so a monthly dataset keeps month labels instead of channel labels.
- Editor template library now includes "双线面积趋势" and "单指标快照".
- API color palette editor now displays tweakcn-style Chart 1/2/3 rows with swatch, hex value, and copy action.

verification:
- npm run typecheck: passed
- npm test: 23 tests passed
- npm run build: passed
- Browser check on http://localhost:3001/editor: two visible SVG previews are exact outerHTML matches; area and metric templates are visible; Chart color rows are visible; no period chevron path.
- Browser check after selecting "双线面积趋势": area renderer uses opacity fill animation plus stroke draw animation and no line-fallback warning.
- Browser check after selecting "单指标快照": preview/export SVGs match; spark bars render; month labels 01 and 12 are present; channel text is not used as the metric-card axis.
- Browser check: line template selected, selectedType=line, selectedStory=change-over-time, line path has pathLength=1 and stroke-dasharray=1.
- Browser screenshot after animation shows the full line connected through the later points.
- Browser check: donut and rose selected their correct types, used channel text, and preview/export SVG matched exactly.
- API check with the user-provided JSON returned status 200, WeChat score 100, period label present, no dropdown chevron path, and only two up-trend indicators because the first metric used trend: "".
- API check with dual-series area JSON returned status 200, WeChat score 100, no warnings, both series legends present, stroke/fill animation present, and imageDataUrl present.
- API check with rose JSON returned status 200, WeChat score 100, 6 sector paths, 6 d animations, 36 arc commands, and a non-empty PNG image.
- Docs browser check confirmed the adaptive card rules and no horizontal overflow.

remaining P3 polish:
- Further visual tuning can continue per chart type, but the current P0/P1/P2 functional issues from this pass are resolved.

data-driven verification update:
- Chart item count is driven by input data, not fixed templates. Bar/horizontal-style visuals render one item per row up to the 200-item SVG safety cap.
- Part-to-whole visuals such as donut, rose, and treemap aggregate by the resolved category field, then render one visual item per resulting category.
- Palette input is treated as seed colors. The renderer expands or trims it to the actual item count and returns the resolved palette in API JSON.
- API JSON now includes meta.visual, meta.mappings, meta.rowCount, meta.itemCount, and meta.export so automation callers can inspect how the request was interpreted.
- Rows with missing or blank category values fall back to Item n instead of producing empty labels or broken groups.
- Regression tests now cover the user's 12-row mixed channel/month case with one missing month: bar returns 12 items and 12 colors; rose returns 5 category items and 5 colors.
- Regression tests also cover network beyond the old 18-node cap and sankey beyond the old 18-link / 8-node cap.
- Regression tests also cover treemap category aggregation so repeated rows do not create repeated tiles.
- Current verification after this update: npm run typecheck passed; npm test -- --run passed with 33 tests; npm run build passed; local API on http://localhost:3001 returned WeChat score 100 for bar, rose, network, sankey, and the adaptive Chinese-label bar case.
- Bar x-axis labels now use adaptive SVG text layout: labels are measured against slot width, CJK labels can split into two `<tspan>` lines, dense charts are sampled, and oversized text falls back to ellipsis.
- Regression tests cover the 12-row Chinese channel label case: `自然流量` renders as `自然` / `流量` instead of overflowing as one long baseline string.

latest chart layout update:
- Area charts now support wide dual-series data such as `month,natural,paid`; palette sizing detects the two numeric series so the two trend lines render in distinct colors.
- The editor "双线面积趋势" template now switches to a real two-series sample dataset instead of reusing the single-value default CSV.
- The same "双线面积趋势" template now also updates JSON and Markdown table inputs from the same two-series source rows, so all three input modes stay aligned.
- Bar chart spacing now uses an adaptive band layout: small datasets get wider centered bars, medium datasets get restrained HeroUI-style spacing, and dense datasets compress width/gaps without fixed template counts.
- Current verification after this update: npm run typecheck passed; npm test -- --run passed with 35 tests; npm run build passed; local API on http://localhost:3001 returned two area trend paths with two distinct strokes and WeChat score 100.

final result: passed

template expansion update:
- Added a horizontal ranking bar template in the editor. The renderer now uses one row per data item, optional ranking sort, adaptive label width, a muted track, colored animated bars, and right-side values.
- Added a Token activity heatmap template in the editor. It ships with 365 daily rows from 2025-07-01 to 2026-06-30 and synchronizes CSV, JSON, and Markdown inputs when selected.
- Added an "activity heat strip" export layout at 960x260 so calendar heatmaps match the wide compact reference shape instead of using the default 720x500 card.
- Rebuilt heatmap rendering as a 7-row calendar grid with month labels derived from real date rows. Supplemental week padding no longer creates a false first-month label.
- Template switching now updates card JSON too: KPI templates keep card metrics; non-KPI chart templates clear card metadata so API requests stay clean.
- Palette generation now safely expands up to 500 colors without long-running color-distance loops.
- API meta now reports itemCount/renderedItemCount from the resolved data item count instead of palette length.
- Docs now describe horizontal-bar and Token heatmap usage and the heatmap 400-item animated SVG cap.
- Current verification after this update: npm run typecheck passed; npm test -- --run passed with 37 tests; npm run build passed; local API on http://localhost:3001 returned 200 for horizontal-bar JSON, heatmap JSON, and PNG exports; emitted PNG previews showed horizontal ranking and a July-to-June Token activity calendar.
