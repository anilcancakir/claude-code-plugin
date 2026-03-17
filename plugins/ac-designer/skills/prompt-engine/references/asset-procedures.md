## Asset Download Procedure

Run this procedure after EVERY `generate_screen_from_text` or `edit_screens` call. Do NOT present results to the user or proceed to the next step until all assets are saved locally.

1. `list_screens` → identify new/updated screen IDs
2. `get_screen` for each → retrieve `htmlCode.downloadUrl` and `screenshot.downloadUrl`
3. HTML: `WebFetch` on downloadUrl → `Write` to `.stitch/designs/{type}/{name}.html` (`{type}` = `layouts`|`pages`)
4. Screenshot: `Bash(curl -sL "{screenshot.downloadUrl}=w{width}" -o .stitch/designs/{type}/{name}.png)` — append `=w{width}` for full resolution
5. Update `metadata.json` screens map
6. Verify: `Bash(ls -la .stitch/designs/{type}/{name}.{html,png})`

**For variants**: download ALL generated variants with numbered suffixes (`settings-variant-a.png`, `settings-variant-b.png`). After user selects one, rename the selected variant to the final name (`settings.png`) and delete rejected variants.

**BLOCKING**: Do NOT show screenshots to user via `Read` until the files are saved locally. Do NOT proceed to the next step until step 6 confirms both files exist.

## Stitch Web Bridge

Bridges the gap between Stitch's text-only API and its image-capable web UI. The Stitch API has NO image upload — only the web UI supports image-to-UI via Gemini 2.5 Pro multimodal.

**When to invoke**: The user provides a screenshot, sketch, or visual reference that should influence the generated design.

### Procedure

1. Run the full **Prompt Enhancement Pipeline** to generate the optimized prompt
2. Save the prompt to `/tmp/stitch-prompt-{page}.md` (complete enhanced prompt with all blocks)
3. Present two options:
   - **Option A — Manual Stitch Bridge** (best quality): User opens `https://stitch.withgoogle.com` → project → "New screen" → uploads reference image + pastes prompt from `/tmp/stitch-prompt-{page}.md` → generates → tells you when done
   - **Option B — Auto mode** (faster, text-only): Generate via `generate_screen_from_text` without visual reference
4. **Option A path**: Wait for user confirmation → `list_screens` → `get_screen` → **Asset Download Procedure**
5. **Option B path**: `generate_screen_from_text` → **Asset Download Procedure**

**BLOCKING**: Do NOT proceed past this step until assets are downloaded locally via either path.
