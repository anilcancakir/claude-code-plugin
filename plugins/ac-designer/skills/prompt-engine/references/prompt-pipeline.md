## Prompt Enhancement Pipeline — Full Steps

Run this pipeline before EVERY `generate_screen_from_text` or `edit_screens` call. Do NOT skip steps. Step 2b only applies when a codebase exists at project root. Step 7 only applies when a layout exists.

### Step 1: Assess Input

Evaluate what the user's prompt is missing:

| Element | Check For | If Missing |
|---------|-----------|------------|
| **Platform** | "web", "mobile", "desktop" | Add based on project context or ask |
| **Page type** | "landing page", "dashboard", "form" | Infer from description |
| **Structure** | Numbered sections/components | Create logical page structure |
| **Visual style** | Adjectives, mood, vibe | Add appropriate atmosphere descriptors |
| **Colors** | Specific hex values or roles | Pull from DESIGN.md or suggest |
| **Components** | UI-specific terminology | Translate vague terms to professional keywords |

### Step 2: Load Design Context

- Check for `.stitch/DESIGN.md` — if it exists, locate the `## DESIGN SYSTEM BLOCK` section. This section will be copied verbatim in Step 6.
- If DESIGN.md does not exist, suggest running design foundation first to establish the design system

### Step 2b: Codebase Context Injection

**Skip this step** if no source code exists at the project root (no `pubspec.yaml`, `package.json`, `composer.json`, or similar project config).

When a codebase exists:

1. Detect project type from root config (`pubspec.yaml` → Flutter, `package.json` → JS/TS, `composer.json` → PHP, `go.mod` → Go)
2. Spawn ac:explore with: `"CONTEXT: Designing {page-name} for {project-type}. GOAL: Extract UI-relevant code context. REQUEST: Routes, Models (field: type), Widgets/Components, Theme tokens. Max 30 lines, no raw source dumps."`
3. Transform explore output into a structured `CODEBASE CONTEXT:` block matching the template in Step 6
4. The CODEBASE CONTEXT block is injected at Step 6 (between DESIGN SYSTEM BLOCK and DESIGN PRINCIPLES)

For greenfield projects (no source code), silently skip this step — CODEBASE CONTEXT block is omitted.

### Step 3: Refine Terminology

- Consult `references/design-mappings.md` to translate vague terms into professional UI/UX language
- Consult `references/prompt-keywords.md` for component keywords and adjective palettes
- Replace generic terms: "menu at the top" becomes "sticky navigation bar with logo and list items"
- Amplify the vibe: "modern" becomes "clean, minimal, with generous whitespace and high-contrast typography"

### Step 4: Inject Design Principles

- Load `references/refactoring-ui-injection.md`
- Find the **Design Principles Injection** section at the bottom of that file
- Copy the `DESIGN PRINCIPLES:` block **verbatim** into the prompt — do not paraphrase or shorten it

### Step 5: Apply Gemini Optimization

Follow rules from `references/gemini-prompt-rules.md`:

- State constraints as **MUST / MUST NOT** imperatives
- Include **hex codes** for every color reference — never a color name without `#hex`
- Use **specific sensory adjectives**, not generic labels
- Specify **component shapes** explicitly (pill-shaped, softly rounded 12px, sharp)
- **Reinforce critical constraints** at both START and END of the prompt
- Add **STYLE CUES** section for gradients, shadows, effects, motion
- Follow section ordering: Vibe → Design System Block → Design Principles → Page Structure → Style Cues → Must Not → Reminder

### Step 6: Assemble Final Prompt

Assemble the final prompt in this exact section order:

```
[One-line vibe description with specific atmosphere adjectives]

[DESIGN SYSTEM BLOCK — copy the content of the `## DESIGN SYSTEM BLOCK` section from `.stitch/DESIGN.md` VERBATIM here. Do NOT paraphrase, summarize, or reassemble. The exact text from DESIGN.md goes here unchanged.]

CODEBASE CONTEXT (skip if greenfield):
- Framework · This Page · Data Model · Navigation · Existing Components · Active Tab

DESIGN PRINCIPLES:
[Injected verbatim from references/refactoring-ui-injection.md]

PAGE STRUCTURE:
1-N. [Section] — [layout], [components with shape/size specs]

STYLE CUES:
- [Gradients, shadows, effects, motion, hover, transitions]

CRITICAL REMINDER: [Reinforce the single most important visual constraint from the DESIGN SYSTEM BLOCK]
```

### Step 7: Layout Reference Injection

**Skip this step** if no layout exists in `metadata.json` or the generation strategy is "full".

When generating a page that references an existing layout:

1. Load the layout's HTML from `.stitch/designs/layouts/{layout-name}.html`
2. Extract the layout shell elements: header, navigation, tab bar, FAB, sidebar, footer
3. Append this block to the prompt (after CRITICAL REMINDER, before sending to Stitch):

```
LAYOUT REFERENCE: This page uses the [{layout-name}] layout shell.
Keep these elements PIXEL-IDENTICAL to the reference:
- Header: [structure, height, elements from layout HTML]
- Tab Bar / Navigation / FAB: [items, style, position from layout HTML]
ACTIVE TAB: "{tab-name}" — move active indicator to this tab.
CONTENT CHANGES ONLY: [Enhanced prompt describes only the main content area]
```
