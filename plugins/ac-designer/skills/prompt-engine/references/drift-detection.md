## Per-Page Drift Detection

Run after EVERY `generate_screen_from_text` or `edit_screens` call, after Asset Download Procedure saves the HTML. Same lifecycle as Asset Download — never skip, re-run on every generation and edit iteration.

1. Load the `## Token Reference` section from `.stitch/DESIGN.md` — find the heading `## Token Reference` and extract all tables beneath it (Colors, Typography, Geometry, Spacing, Shadows). This is the **expected token set**.
2. Read the generated page HTML from `.stitch/designs/{type}/{name}.html`
3. Extract tokens from the HTML — follow the **Extraction Rules** in `references/design-tokens-v2.md`. Handle all three forms:
   - Inline styles (`color: #hex`, `background-color: #hex`, `border-color: #hex`)
   - Tailwind arbitrary-value classes (`bg-[#hex]`, `text-[#hex]`, `border-[#hex]`)
   - Named Tailwind utilities (`bg-slate-900`, `text-blue-500`) — resolve each to its hex value using the Tailwind default palette
4. Compare each extracted token against the Token Reference expected set. Assign a status:

   | Status | Condition |
   |--------|-----------|
   | **MATCH** | Hex values identical (case-insensitive comparison) |
   | **NEAR_MATCH** | Hex Manhattan distance ≤ 6 per channel — see formula below |
   | **DRIFT** | Hex differs beyond NEAR_MATCH threshold |
   | **MISSING** | Token exists in Token Reference but was not found in the HTML |
   | **EXTRA** | Token found in HTML that does not appear in Token Reference |

   **Color tolerance formula**: Parse both hex values into (R, G, B) channels (0-255). Compute per-channel absolute difference: `|ΔR|`, `|ΔG|`, `|ΔB|`. If `max(|ΔR|, |ΔG|, |ΔB|) ≤ 2` → NEAR_MATCH. If any channel exceeds 2 → DRIFT. Example: expected `#3B82F6`, actual `#3B82F5` → ΔB = 1 → NEAR_MATCH. Expected `#1E293B`, actual `#2D3748` → ΔR = 15, ΔG = 14, ΔB = 13 → DRIFT.

5. Build a drift table for each token category (Colors, Typography, Geometry, Spacing, Shadows):

   ```
   ### Colors
   | Token | Expected | Actual | Status |
   |-------|----------|--------|--------|
   | Primary | #3B82F6 | #3B82F5 | NEAR_MATCH |
   | Surface | #1E293B | #2D3748 | DRIFT |
   | Destructive | #EF4444 | — | MISSING |

   ### Typography
   | Token | Expected | Actual | Status |
   |-------|----------|--------|--------|
   | H1 | text-3xl font-bold | text-2xl font-bold | DRIFT |
   | Body | text-sm font-normal | text-sm font-normal | MATCH |

   ### Geometry
   | Token | Expected | Actual | Status |
   |-------|----------|--------|--------|
   | Card | rounded-xl | rounded-lg | DRIFT |
   | Button | rounded-lg | rounded-lg | MATCH |
   ```

6. Report the drift table to the user:
   - **DRIFT**: describe the deviation — "Primary color shifted from #3B82F6 to #2563EB (ΔR=0, ΔG=31, ΔB=11)"
   - **EXTRA**: flag the unexpected token — "Found undeclared color #6366F1 (indigo-500) on 2 elements"
   - **NEAR_MATCH**: note as acceptable but flag for awareness — "Surface #1E293B vs #1E293A — within tolerance"
   - **MISSING**: note absent tokens — "Destructive color #EF4444 not used on this page" (may be expected if the page has no destructive actions)
   - **MATCH**: no action needed, include in table for completeness
7. Present options to the user:
   - **Fix via `edit_screens`** — use `edit_screens` with a targeted prompt to correct the drifting tokens (include the specific hex values and Tailwind classes that need correction)
   - **Accept as-is** — the page design is intentionally different; skip correction
   - **Update DESIGN.md Token Reference** — only if the drift represents a deliberate design evolution (user must manually edit `.stitch/DESIGN.md`)

**Never block** — present findings as warnings and wait for user decision. Do not regenerate or edit automatically.

## Cross-Page Drift Detection

Run when invoked by `/ac-designer:audit` command. Compares tokens across all generated pages to detect inter-page inconsistencies.

1. Collect all page HTML files from `.stitch/designs/pages/*.html`
2. For each page HTML, extract tokens using the **Extraction Rules** in `references/design-tokens-v2.md` — same three-form extraction as Per-Page step 3
3. Load the `## Token Reference` section from `.stitch/DESIGN.md` as the baseline expected set
4. Build a drift matrix for each token category. For every token name, show the DESIGN.md expected value and each page's extracted value:

   ```
   ### Colors
   | Token | DESIGN.md | home.html | settings.html | profile.html | Consensus |
   |-------|-----------|-----------|---------------|--------------|-----------|
   | Primary | #3B82F6 | #3B82F6 ✓ | #3B82F5 ~ | #2563EB ✗ | 2/3 match |
   | Surface | #1E293B | #1E293B ✓ | #1E293B ✓ | #1E293B ✓ | 3/3 match |
   | Border | #334155 | #334155 ✓ | — ✗ | #334155 ✓ | 2/3 match |
   ```

   Status markers: `✓` = MATCH, `~` = NEAR_MATCH, `✗` = DRIFT, `—` = MISSING

5. Build a summary line per category:
   - "Colors: 2 tokens drift across 1 page | Typography: clean | Geometry: 1 drift | Spacing: clean | Shadows: clean"
6. If a majority of pages (>50%) consistently use a **different** value for a token than what DESIGN.md declares: flag as **"Possible DESIGN.md staleness"** — the design system may have evolved during iteration. Suggest re-running `/ac-designer:init` to regenerate the token baseline from the most recent screens.

**Advisory only** — present findings as warnings, user decides what to fix. Do not auto-correct or block any workflow.
