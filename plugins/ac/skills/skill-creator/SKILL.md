---
name: skill-creator
description: "Create Claude Code skills with progressive disclosure architecture. Use when building reusable workflow skills, domain-specific skills, or optimizing existing skills for Claude Code plugins."
when_to_use: "TRIGGER when: 'create a skill', 'add a skill', 'new skill for', building Claude Code plugin skills. DO NOT TRIGGER: creating agents, commands, or rules."
effort: high
---

# Skill Creator

Create high-quality Claude Code skills following progressive disclosure — metadata always loaded, SKILL.md body on trigger, references on demand.

## Core Process

**1. Interview**

Gather requirements through focused questions. Limit to 3-4 AskUserQuestion calls maximum:

1. What should this skill enable?
2. When should it trigger? (user phrases, file patterns, contexts)
3. What tools does it need? (Read, Write, Edit, Bash, Agent, etc.)
4. What model suits best? (Haiku for fast/search, Sonnet for standard, Opus for complex/architecture)

Skip questions where the answer is obvious from context.

**2. Explore Existing Patterns**

Use Glob + Read directly to find existing conventions in the target project:

- Glob `**/skills/**/SKILL.md` to list defined skills, read 2-3 closest matches
- Sample the file structure and naming conventions via `ls`
- Detect the technology stack from manifest files (`package.json`, `composer.json`, `pubspec.yaml`)

**3. Dedup Audit**

Read `${CLAUDE_SKILL_DIR}/../prompt-writer/references/cc-dedup-guide.md` before drafting. Check what CC already provides natively — the skill body must not repeat general concepts the model already knows. Cut anything CC handles by default.

**4. Draft Skill**

Follow progressive disclosure. SKILL.md body ≤500 lines. Move detail to `references/`. Read `references/skill-patterns.md` for description patterns, invocation control, string substitutions, and directory structure before writing.

Key decisions at this stage:
- Which description pattern fits? (A/B/C/D — see skill-patterns.md)
- `user-invocable: false`? `disable-model-invocation: true`? (see Invocation Control Matrix)
- `context: fork` if the skill is self-contained and parallelizable?
- `paths:` if the skill activates only for specific file types?

**5. Wire References**

CC does NOT auto-load `references/` files. The model never sees them unless SKILL.md points to them explicitly.

1. Add inline "read this when" links at the point of use.
2. Add a `## References` table at the end for 3+ files.
3. Verify every file in `references/`, `scripts/`, `assets/` is reachable — orphan files are invisible.

**6. Frontmatter Validation**

Read `${CLAUDE_SKILL_DIR}/../prompt-writer/references/frontmatter-schemas.md` for the complete skill frontmatter schema. Key effective fields: `name`, `description`, `when_to_use`, `user-invocable`, `disable-model-invocation`, `effort`, `context`, `agent`, `argument-hint`, `arguments`, `paths`, `hooks`. Do NOT declare `model`, `allowed-tools`, `disallowedTools`, or `tools` — CC ignores them for plugin components.

**7. Review**

Present the draft. Run the quality checklist below before delivering.

---

## Progressive Disclosure Architecture

Design every skill with three loading levels.

**Level 1 — Metadata (~100 tokens)**
- Only `name` + `description` injected into `<system-reminder>` listing
- Hard cap: 250 characters per entry — front-load key use case
- This is ALL the model sees until it invokes the skill

**Level 2 — SKILL.md body (≤5k tokens)**
- Full body injected on invocation via Skill tool or `/name`
- On context compaction: truncated to 5,000 tokens with ellipsis
- Target: <500 lines / <3k words. Challenge every token — the model already knows general concepts

**Level 3 — Bundled resources (unlimited)**
- `references/` — detailed docs, API refs, schemas
- `scripts/` — executable helpers (stdout consumed, source NOT loaded)
- `assets/` — HTML templates, static files
- NOT auto-loaded — model must explicitly Read them
- One level deep rule: `SKILL.md → reference.md` works. Deeper chains break

---

## Token Efficiency

- SKILL.md body under 500 lines / 3k words
- Large references (>100 lines) need a TOC at the top
- Scripts in `scripts/` — executed, not loaded (only stdout consumes tokens)
- Avoid time-sensitive information in the body
- Move API refs, schemas, and boilerplate to `references/`

---

## Quality Checklist

Run before presenting any skill to the user.

**Frontmatter**
1. Description ≤250 chars, front-loaded with key use case?
2. `when_to_use` present for auto-triggered skills?
3. `user-invocable` / `disable-model-invocation` set correctly?
4. No ineffective frontmatter declared (`model`, `allowed-tools`, `disallowedTools`, `tools`)?
5. `paths` field used if file-type specific? `context: fork` if parallelizable?

**Content**
6. Every sentence is an action? ("Consider" → "Use", "Extract", "Run")
7. No unnecessary concept explanations? (the model already knows them)
8. No vague words? ("good", "proper" → concrete rule)
9. No repetition across sections?
10. CRITICAL/IMPORTANT inflation? Maximum 1-2 per file

**Progressive Disclosure**
11. SKILL.md body <500 lines? References >100 lines have TOC?
12. Every reference explicitly linked with "read this when" guidance?
13. All files in `references/` reachable from SKILL.md?
14. One level deep only — no chained reference files?

**Style**
15. Imperative mood throughout? No passive voice?
16. Nesting depth ≤1? Sentences under 25 words?
17. No hardcoded paths or usernames?

---

## References

| Topic | File | When to read |
|-------|------|-------------|
| Skill patterns | [skill-patterns.md](references/skill-patterns.md) | Before drafting — description patterns, invocation matrix, string substitutions, directory structure |
| Shared writing conventions | `${CLAUDE_SKILL_DIR}/../prompt-writer/references/cc-dedup-guide.md` | Before drafting — what CC already provides natively (skip in skill body) |
| Frontmatter schema | `${CLAUDE_SKILL_DIR}/../prompt-writer/references/frontmatter-schemas.md` | During frontmatter validation — complete field reference |
