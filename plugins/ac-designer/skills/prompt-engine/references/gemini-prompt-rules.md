# Gemini Prompt Rules for Design Generation

Quick-reference for writing Gemini-targeted design prompts. Distilled from Google DeepMind's Antigravity, AI Studio, and Gemini CLI system prompts.

## Structural Rules

State constraints as MUST/MUST NOT imperatives, always paired with Correct/Incorrect examples. This is Gemini's highest-confidence instruction pattern.

| Pattern | Effect |
|---------|--------|
| `MUST` + Correct example | Model follows with high reliability |
| `MUST NOT` + Incorrect example | Model avoids the anti-pattern |
| Abstract rule without examples | Model ignores or misinterprets — never do this |

## Section Ordering

Prompts MUST follow this exact order:

1. **Vibe/Atmosphere** — one-line mood sentence
2. **DESIGN SYSTEM (REQUIRED)** — tokens, palette, typography, spacing
3. **PAGE STRUCTURE** — numbered sections with component specs
4. **Style Cues** — gradients, shadows, effects, motion
5. **Constraints** — MUST NOT blacklist and critical reminders

Placing design system before page structure ensures tokens are established before components reference them.

## Critical Reinforcement

Repeat key constraints at START and END of the prompt. Gemini loses long-range instructions — bracketing with the same rule prevents drift.

```
[Opening] CRITICAL: No generic Bootstrap styling. Every element must reference the design system.
...full prompt body...
[Closing] CRITICAL REMINDER: AESTHETICS ARE VERY IMPORTANT. If the result looks simple and basic, you have FAILED.
```

## Atmosphere Specification

Use SPECIFIC sensory adjectives, not generic labels.

| Bad | Good |
|-----|------|
| "modern design" | "clean, minimal, with generous whitespace and high-contrast typography" |
| "dark theme" | "deep charcoal (#1A1A2E) with electric accent highlights and soft ambient glow" |
| "professional look" | "editorial layout with tight grid, muted tones, and restrained serif headings" |

## Color Precision

Include hex codes for EVERY color reference. Never say a color name without `#hex`.

Format: `Descriptive Name (#hexcode) for functional role`

```
- Deep Ocean (#0F172A) for primary backgrounds
- Electric Violet (#7C3AED) for interactive elements and CTAs
- Soft Mist (#F1F5F9) for card surfaces
- Coral Accent (#F43F5E) for destructive actions and alerts
```

## Component Shapes

Specify shape explicitly — Gemini defaults to inconsistent rounding without clear instructions.

| Vague | Precise |
|-------|---------|
| "rounded buttons" | "pill-shaped buttons (border-radius: 9999px)" |
| "rounded cards" | "softly rounded cards (border-radius: 12px)" |
| "sharp look" | "squared-off containers (border-radius: 0)" |
| "slightly rounded" | "subtle rounding (border-radius: 4px)" |

## Blacklist Pattern

Use explicit MUST NOT lists to prevent Gemini from falling back to common but unwanted defaults.

```
MUST NOT:
- Use default browser form styling
- Use pure black (#000000) for text — use Dark Ink (#1E293B) instead
- Add stock placeholder images or lorem ipsum
- Use generic shadows — specify exact values (0 4px 6px -1px rgba(0,0,0,0.1))
- Fall back to Bootstrap or default Tailwind component patterns
```

## Example Prompt Skeleton

```
A [specific atmosphere adjectives] [page type] with [distinctive visual trait].

DESIGN SYSTEM (REQUIRED):
- Primary: [Name] (#hex) — [role]
- Secondary: [Name] (#hex) — [role]
- Accent: [Name] (#hex) — [role]
- Background: [Name] (#hex) — [role]
- Surface: [Name] (#hex) — [role]
- Text: [Name] (#hex) — [role]
- Font: [family] — headings [weight], body [weight]
- Spacing: [base unit]px scale
- Radius: [component] [value]px, [component] [value]px

PAGE STRUCTURE:
1. [Section name] — [layout description], [key components with shape/size specs]
2. [Section name] — [layout description], [key components with shape/size specs]
3. [Section name] — [layout description], [key components with shape/size specs]

STYLE CUES:
- [Gradients, shadows, glassmorphism, micro-animations]
- [Hover effects, transitions, interactive feedback]

MUST NOT:
- [Anti-pattern 1]
- [Anti-pattern 2]
- [Anti-pattern 3]

CRITICAL REMINDER: [Reinforce the single most important visual constraint].
```
