# Design Mappings & Descriptors

Use these mappings to transform vague user requests into precise, high-fidelity design instructions.

## UI/UX Keyword Refinement

| Vague Term | Enhanced Professional Terminology |
|:---|:---|
| "menu at the top" | "sticky navigation bar with logo and list items" |
| "big photo" | "high-impact hero section with full-width imagery" |
| "list of things" | "responsive card grid with hover states and subtle elevations" |
| "button" | "primary call-to-action button with micro-interactions" |
| "form" | "clean form with labeled input fields, validation states, and submit button" |
| "picture area" | "hero section with focal-point image or video background" |
| "sidebar" | "collapsible side navigation with icon-label pairings" |
| "popup" | "modal dialog with overlay and smooth entry animation" |

## Atmosphere & "Vibe" Descriptors

Add these adjectives to set the mood and aesthetic philosophy:

| Basic Vibe | Enhanced Design Description |
|:---|:---|
| "Modern" | "Clean, minimal, with generous whitespace and high-contrast typography." |
| "Professional" | "Sophisticated, trustworthy, utilizing subtle shadows and a restricted, premium palette." |
| "Fun / Playful" | "Vibrant, organic, with rounded corners, bold accent colors, and bouncy micro-animations." |
| "Dark Mode" | "Electric, high-contrast accents on deep slate or near-black backgrounds." |
| "Luxury" | "Elegant, spacious, with fine lines, serif headers, and a focus on high-fidelity photography." |
| "Tech / Cyber" | "Futuristic, neon accents, glassmorphism effects, and technological monospaced typography." |

## Geometry & Shape Translation

Convert technical values into physical descriptions for Stitch:

- **Pill-shaped**: Used for `rounded-full` elements (buttons, tags).
- **Softly rounded**: Used for `rounded-xl` (12px) or `rounded-2xl` (16px) containers.
- **Sharp/Precise**: Used for `rounded-none` or `rounded-sm` elements.
- **Glassmorphism**: Semi-transparent surfaces with background blur and thin borders.

## Hierarchy

Map vague importance terms to Refactoring UI visual weight levels:

| Vague Term | Visual Weight Mapping |
|:---|:---|
| "important text" | Primary: large font-weight 700, high-contrast color (#111827) |
| "less important" | Secondary: medium font-weight 500, muted color (#6B7280) |
| "small print" | Tertiary: small font-weight 400, soft gray (#9CA3AF) |

## Spacing

Map vague spacing requests to a 4px grid system:

| Vague Term | Grid Value |
|:---|:---|
| "tight spacing" | 4px micro gap (token: space-1) |
| "some space" | 16–24px component padding (token: space-4 to space-6) |
| "breathing room" | 32–48px generous whitespace between groups (token: space-8 to space-12) |
| "lots of space" | 48–64px section padding (token: space-12 to space-16) |

## Depth & Elevation

Foundational depth styles:

- **Flat**: No shadows, focus on color blocking and borders.
- **Whisper-soft**: Diffused, light shadows for subtle lift.
- **Floating**: High-offset, soft shadows for elements that appear high above the surface.
- **Inset**: Inner shadows for pressable or nested elements.

5-level shadow scale for precise elevation control:

| Level | Name | Use Case | Shadow |
|:---|:---|:---|:---|
| 1 | Subtle lift | Buttons, interactive elements | `0 1px 2px rgba(0,0,0,0.05)` |
| 2 | Raised surface | Cards, dropdowns | `0 4px 6px rgba(0,0,0,0.07)` |
| 3 | Floating | Popovers, tooltips | `0 10px 15px rgba(0,0,0,0.10)` |
| 4 | Overlay | Modals, drawers | `0 20px 25px rgba(0,0,0,0.15)` |
| 5 | Sky-high | Drag targets, large overlays | `0 25px 50px rgba(0,0,0,0.25)` |

## Polish & Finish

Last-mile refinements that elevate a design from "done" to "polished":

| Vague Request | Refined Approach |
|:---|:---|
| "add a border" | Consider shadow or spacing for separation first — borders are last resort. |
| "make it look finished" | Add accent borders for visual interest, consistent shadow system, polished empty states. |
