# WhatIf

Business decision planning for Indonesian small businesses. Bahasa Indonesia, integer Rupiah, browser-local persistence, no account or API key required.

The application combines conditional decision simulations, historical order forecasting, decision trials, actual-result evaluation, and operating/cash planning. The interface keeps three main navigation items: **Beranda, Simulasi, Tersimpan**. Extra choices and detailed assumptions are progressively disclosed.

## Run locally

Requires Node.js 22+ and npm. This workspace includes a portable runtime:

```powershell
$env:Path="$PWD\.tools\node-v22.16.0-win-x64;$env:Path"
npm.cmd install
npm.cmd run dev -- --port 5173 --strictPort
```

Open **http://127.0.0.1:5173/**. `start-local.ps1` also sets up the portable runtime and starts the app.

The submission archive and GitHub checkout exclude `.tools` and `node_modules`. On another computer, install Node.js 22+, run `npm ci`, then `npm run dev` using that system runtime.

## Academic submission

- Author: **Ali Rifqi Rafsanjani**, NIM **2422052**.
- Program: **Technopreneur**, Institut Teknologi Batam.
- Course: Interaksi Manusia dan Komputer; lecturer: Zainul Munir, S.T., Me.TC.
- Public repository: https://github.com/qibytecom/whatif
- [Complete academic report and source appendix](deliverables/WhatIf_Laporan_Lengkap_Ali_Rifqi_2422052.pdf)
- [Main report](deliverables/Laporan_Utama_WhatIf.pdf) · [Full source appendix](deliverables/Lampiran_Kode_WhatIf.pdf)

Documentation scripts: `node scripts/capture-academic.mjs`, `node scripts/build-academic-report.mjs`, and `node scripts/inspect-academic-pdf.mjs`. Screenshots use explicitly fictional data. Report dates and identity are maintained in `docs/academic-metadata.json`.

```text
npm test                  # Engine, forecasting, storage, CSV and profile tests
npm run lint              # ESLint
npm run build             # Strict TypeScript and Vite production build
npm run test:e2e           # Full Chrome browser flows
node scripts/inspect-layout.mjs  # Responsive screenshots and actual A4 PDF
```

Browser tests use installed Chrome through Playwright's `chrome` channel. Use an available Playwright browser/channel on another machine. There are no paid runtime services.

## Using the product

1. Choose fictional Kopi Senja demo data or enter a business profile.
2. Choose price, promotion, or staffing. Expand **Keputusan bisnis lainnya** for marketing, opening hours, stock, equipment, product mix, sales channels, expansion, or a downturn.
3. Read the profit change and **Batas aman keputusan**. Expand the explanation, alternatives, cash timeline, or detailed assumptions as needed.
4. Save and compare up to three scenarios. Choose an objective: profit, cash preservation, capacity, or resilience to a 20% demand decline.
5. From Beranda, open **Ke mana arah bisnis saya?** to record daily sales or import CSV. Forecasts become available only after basic data eligibility checks.
6. Apply a 30-day historical forecast as a scenario demand assumption, then test your proposed decision. The source/method is saved with the scenario.
7. Choose **Mulai uji keputusan**, set dates, and save the trial. The business profile, scenario, and expected results are frozen for that trial.
8. Open **Bagaimana hasil keputusan saya?** / **Lihat uji keputusan & hasil nyata** to enter actual period totals. Compare them with the frozen forecast, record context, and create a new scenario using the observed order rate.

Routes: `/`, `/simulator`, `/scenarios`, `/history`, `/decisions`, `/insights`, `/reports`, `/settings`. The last two analysis/report routes are available through simulation details. Settings opens from the business name in the header.

## Features implemented

- Live pricing, full or partial discounts, bundle orders, vouchers represented by an effective discount, and shipping subsidies.
- Staffing, added capacity, opening days/hours, and explicitly entered hourly costs.
- Marketing with manual demand assumptions or an explicit visitors/conversion/one-repeat-purchase funnel.
- Stock in order-equivalent units, FIFO consumption, expiry, lead time, reorder point, purchase quantity, lost orders, waste, and purchase cash outflow.
- Equipment purchases or rentals, cost savings, additional capacity, upfront capital, and conditional simple payback.
- Weighted product mix, shared operating capacity, channel commissions, packaging, and combined operating assumptions.
- Additional-location planning with combined business demand, capacity, fixed expenses, and initial investment.
- Stress tests, profit targets, capacity constraints, conditional safe order thresholds, exact additive profit explanations, and editable hypothetical alternatives.
- Model-month cash projections for 1–12 months, receipt/payment delays, opening receivables/payables, minimum cash, reserve requirements, and out-of-horizon balances.
- Daily history, event labels, strict CSV import, merge/overwrite confirmation, deletion confirmation, export, template, and an explicitly fictional example CSV download.
- Historical order forecasts for 7/30/90 days, rolling-origin checks, method selection, data-source labels, missing/stale data notes, and illustrative error sensitivity ranges.
- Decision journal, frozen baselines, actual-result evaluation, notes, status filters, confirmed deletion, and observed-volume reference scenarios.
- Full validated JSON backups, old-backup defaults, corrupt-storage recovery warnings, comparison CSV, individual scenario JSON, printable reports, and PDF through the browser.
- Minimalist Lucide icons, responsive layouts, keyboard focus, dialog focus trapping, and reduced-motion support.

## Model: monthly operating result

`src/lib/simulation/index.ts` is the shared pure engine for cards, comparisons, stress tests, targets, and reports.

- Baseline: 40 orders/day × 26 days × (Rp25,000 − Rp10,000) − Rp9,000,000 = **Rp6,600,000/month**.
- Effective operating days are baseline days plus the explicit change, clamped to 1–31.
- Product mix uses entered relative weights to calculate average product price/cost. This is an average-order model, not separate SKU demand forecasts.
- A bundle multiplies product units/costs and uses its entered package price or normal price × units. Prices are rounded to Rupiah once after price change and the effective weighted discount.
- Effective discount = entered discount × promotional order share. The default promotional share is 100%.
- Variable order cost includes rounded product/bundle cost less savings (minimum zero), packaging, weighted shipping subsidy, and rounded channel commission. Commission applies only to the entered channel share.
- Demand = baseline demand × (1 + explicit demand change) plus explicit funnel orders / operating days, when the funnel is enabled.
- Funnel orders = visitors × conversion × (1 + one-repeat-purchase rate). These are user assumptions, not automatic advertising predictions.
- Capacity = existing capacity + new employees × capacity per employee + entered capacity adjustment + additional hours × orders/hour; minimum zero.
- Without stock constraints, monthly orders = floor(min(demand, capacity) × operating days). Fractional intermediates are retained; rounding to whole orders happens once at the monthly total.
- Costs = served orders × variable order cost + stock waste at ingredient cost + existing fixed expenses + marketing + new salaries + entered recurring costs + rounded additional hourly costs.
- Existing salaries are already included in baseline fixed expenses. New workers create capacity; demand changes remain explicit.
- Initial investment affects cash and simple payback, and is excluded from operating profit. Tax, interest, and depreciation are not modeled.

Profit-change explanation reconciles exactly: original volume × change in contribution + volume change × new contribution − change in fixed expenses − inventory waste.

### Reverse targets and safe thresholds

For positive contribution, required orders = ceil((target + fixed costs + modeled waste costs) / contribution), minimum zero. Feasibility checks capacity and, for stock-enabled scenarios, forward results at current demand/full capacity.

Stock targets are explicitly conditional on waste costs at the current simulated volume. Reordering/expiry can change with volume; stock-enabled reverse results are not presented as a globally optimized minimum. The UI asks users to retest stock policy as assumptions change.

A 10% price increase in the Kopi Senja example needs **892 served monthly orders** to maintain the Rp6.6m baseline profit, assuming unchanged costs.

### Inventory and cash

Cash and stock timelines use **30-day model months**, not real invoice/holiday calendars. Monthly orders and routine expenses are spread over these model days; forecasts of daily historical orders use actual dates separately.

Stock is measured in ingredient quantities sufficient for one modeled order. Initial stock is already paid. At each model day: expired stock is written off; arrivals are received; orders consume available stock FIFO; lost orders are counted; a purchase is placed if on-hand plus pending stock is at/below the reorder point. New supplies arrive after the entered lead time. Lead time is at least one day. Purchase cash is scheduled from order placement plus payment delay.

Profit expenses ingredients when sold/wasted. Cash expenses new ingredient purchases when paid. Packaging, commission, and subsidies are charged on served orders; they are not treated as expired ingredients. This avoids counting ingredient purchases twice. Open orders beyond the model horizon remain pending inventory commitments.

Cash starts at entered cash less upfront investment. Customer receipts and variable-cost bills are delayed explicitly. Fixed expenses are evenly paid during the model month. Opening receivables/payables affect cash only. Unpaid/unreceived amounts beyond the horizon are shown separately. Future month assumptions remain constant unless users change and compare scenarios; inventory carry/expiry continues across months.

## Historical forecasting

`src/lib/forecast/index.ts` forecasts **served order volume**, not latent unmet demand or causal price elasticity.

- Only observations on/before the as-of date are used; there is no future-data leakage.
- Normal days and explicitly closed zero-order days are eligible. Promo, price-change, stockout, and special-event days are excluded from the normal baseline.
- At least 21 eligible observations and five distinct weekdays are required for an initial model. This is an MVP eligibility rule, not a guarantee of statistical adequacy. Closed days should be explicitly recorded, and unknown dates are never silently filled with zero.
- Three candidates: same-weekday average of up to four past observations, last-14-observation mean, last-7-observation mean.
- Rolling-origin tests start after 14 observations and are capped to the most recent 90 test origins. Every held-out prediction uses only earlier records. The weekday method looks within the latest 56 observations for up to four matches. Lowest mean absolute error selects the candidate.
- The displayed error is the selection-test daily error, not an independent final test or measured 30/90-day error.
- Dashed sensitivity bounds use the empirical 80th percentile of absolute daily test errors. They are explicitly **not calibrated future probability intervals**.
- Missing-date counts, stale last-observation warnings, price-context differences, method names, sample counts, and test counts are visible.
- Historical forecasts do not infer how a new price, promotion, investment, competitor, or weather event causes demand to change. Users enter those assumptions or learn from a trial.
- Applying a forecast normalizes the 30-calendar-day served-order total to the profile's operating days. Business baseline demand must be positive and within the supported change range. The source is snapshotted in the saved scenario.

CSV columns: `tanggal,pesanan,harga,biaya,kejadian,catatan`. `tanggal` and `pesanan` are required. Omitted optional price/cost columns use the current profile. Common English aliases are accepted. Money uses plain integer Rupiah. Event codes: `normal,promo,price,closed,stockout,special`. Quoted commas/newlines and semicolon CSV are supported. Duplicate dates, invalid calendar dates, negative values, future actual records, and inconsistent columns are rejected. Duplicate dates against existing data require confirmation before replacement. The fictional sample is always labeled in its notes and warned about in the UI.

## Decision learning

Trials retain immutable copies of the business/scenario assumptions and the expected result. Updating a business profile recalculates ordinary saved scenarios; it does **not** rewrite historical trial snapshots.

Expected results are normalized to the inclusive trial duration using a 30-day model month. Actual entries cover that same full period: served orders, revenue, variable costs, and recurring operating costs. Actual profit = actual revenue − actual variable costs − actual recurring costs. Context notes are retained.

Creating a reference scenario from a completed trial uses its observed volume, normalized to the current business's operating days. It does not attribute all observed changes causally to the decision or fabricate daily history from aggregate actual totals.

## Persistence, source, and reports

The stable `whatif:v1` key holds a schema-version-1 document. This release adds optional/defaulted `history`, `decisions`, and scenario `plan` fields. Older version-1 backups are read with neutral defaults; unsupported schema versions are rejected. JSON backup/restore includes all new fields and frozen trial snapshots. LocalStorage errors leave data usable in memory with a visible backup warning.

```text
src/app/                   Routes
src/pages/                 Main, history, journal, settings, report views
src/components/planning/   Operating inputs, decision panels, report sections
src/lib/simulation/        Shared financial engine
src/lib/planning/          Inventory, cash, decision analysis and trial snapshots
src/lib/forecast/          Historical prediction and CSV
src/lib/validation/        Zod persistence/input schemas
src/lib/storage/           Zustand store, backup validation, downloads
src/tests/                 Financial, forecast, import, persistence and form tests
e2e/                       Chrome functional and responsive tests
```

Reports use the selected saved scenario, exact same engine, current target/stress assumptions, operating/cash assumptions, and relevant completed evaluations. CSV exports baseline plus that selected scenario. Print CSS hides navigation and controls. Use browser Print / Save as PDF. Nothing is publicly deployed.

## Cloudflare Pages

1. Push source to your repository; exclude `.tools`, `node_modules`, and test artifacts.
2. Create a Cloudflare Pages project connected to that repository.
3. Set Node version `22`, build command `npm run build`, output `dist`.
4. `public/_redirects` supplies SPA fallback for deep links.
5. Import a JSON backup at the new origin to move browser-local data.

## Scope and verification

This is a local planning MVP. There is no authentication, cloud sync, POS integration, real-time market feed, automatic price elasticity, calibrated success probability, SKU-level inventory model, separate branch P&Ls, tax, interest, or depreciation. Product mix and expansion use shared average-order economics. Forecasts require usable historical data; scenario outcomes remain conditional on assumptions.

Automated checks cover the original baseline, pricing, promotions, staffing, reverse feasibility, stock conservation, waste, cash reconciliation, delayed balances, marketing, weighted products, trial snapshots, CSV validation, and future-data exclusion. Browser tests cover all planning types, forecast import/application, actual evaluation, saved state, reporting, and responsive navigation. Use the commands above to reproduce. Screenshots and generated PDF are written to ignored `test-results/`.

Final functional verification: **45 unit/form tests and 14 browser tests passed**, plus strict TypeScript, ESLint, and production build. Responsive checks cover 1440, 768, and 390 pixels. Forecasts and evaluation can be exercised through the explicitly fictional sample CSV without external credentials.
