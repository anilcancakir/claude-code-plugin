---
description: Auto-generate .claude/rules/ — path-scoped coding conventions from project analysis. Re-run after codebase changes to update rules while preserving manually added conventions.
effort: medium
argument-hint: update or enhance (optional)
---

# Init Project Rules

Generate `.claude/rules/*.md` files for the active codebase — path-scoped instructions auto-injected when matching files are touched.

**Authoring knowledge**: Rule format, frontmatter, two-tier system, context layer stack, dedup checks, and anti-slop rules live in the `rule-creator` skill. Read it before writing any rule content. The `claude-md-writer` skill's dedup guide covers the project→rules boundary.

---

## Phase 1: Discovery

Detect tech stacks, score directories, extract conventions. Use Glob, Grep, and Read directly in the main context — no subagents. Source code always takes priority over docs.

1. **Tech Stack Detection** — Glob for `package.json`, `composer.json`, `pubspec.yaml`, `Cargo.toml`, `go.mod`, `pyproject.toml`, `Gemfile`. Read each to extract framework, version, key dependencies. Detect monorepo roots (`workspaces` fields, `packages/`, `apps/`). Assemble: stack | framework | version | root path.

2. **Directory Scoring** — Run `ls` at depth 2-3, skipping `vendor/`, `node_modules/`, `dist/`, `build/`, `.git/`. For each significant directory: count files and subdirs (via Glob), detect own entry point (`index.*`, `__init__.py`, service providers, barrel exports), detect distinct patterns (`contracts/`, `drivers/`, `concerns/`, `middleware/`, `migrations/`). Assemble: directory | file count | subdir count | has entry | has patterns | total score.

3. **Convention Extraction** — For each major directory, Read 3-5 source files and extract: import style, naming pattern, architectural pattern (facades, repos, controllers, middleware), API usage patterns, anti-patterns. Grep for `DO NOT|NEVER|DEPRECATED` comments. Read linter configs (`.eslintrc*`, `phpstan.neon`, `analysis_options.yaml`). Priority: source code over docs. Assemble: directory | conventions list | gotchas.

4. Gather dedup context via Bash:

   ```bash
   ls -la .claude/rules/ 2>/dev/null
   cat .claude/rules/*.md 2>/dev/null
   cat CLAUDE.md 2>/dev/null | head -80
   cat ~/.claude/CLAUDE.md 2>/dev/null | head -80
   find . -maxdepth 3 -type f \( -name "*.dart" -o -name "*.php" -o -name "*.ts" -o -name "*.vue" -o -name "*.py" -o -name "*.go" -o -name "*.rs" \) | sed 's|/[^/]*$||' | sort | uniq -c | sort -rn | head -20
   ```

   - If existing rules found → read each rule file fully to identify user-added vs auto-generated content
   - If `$ARGUMENTS` is "update" → mark update mode — preserve user-added conventions in existing rules, only update auto-detected patterns

5. Merge into: stacks detected + directory scores + conventions per domain

---

## Phase 2: Scoring & Rule Planning

Decide which rules to create and their content.

1. Apply scoring to each directory:

   | Factor | Weight | Threshold |
   |--------|--------|-----------|
   | File count | 3x | >10 |
   | Subdirectory count | 2x | >3 |
   | Own config/entry point | 2x | Has one |
   | Unique patterns (contracts, drivers) | 2x | Present |
   | Complexity (LOC) | 1x | >500 |

   | Score | Decision |
   |-------|----------|
   | **>12** | Create dedicated domain rule |
   | **6-12** | Create if patterns clearly differ from stack-level |
   | **<6** | Stack-level rule covers it |

2. For each proposed rule, define:
   - File name (descriptive: `database.md`, `api-routes.md`)
   - Path glob(s)
   - Content outline

3. **Deduplication**: Apply `rule-creator` skill's dedup check algorithm against existing sources (project CLAUDE.md, global CLAUDE.md, my-coding skill). For each proposed rule: exact match → skip, semantic overlap → skip, conflict → flag for user in Phase 3, complement → keep. Compare across proposed rules → no rule-to-rule duplication

4. Present as table with type, path, score, key content after dedup

---

## Phase 3: Interactive Review

Get user approval on proposed rules.

1. Present proposed rules table:

   | Rule | Type | Path Glob | Score | Key Points |
   |------|------|-----------|-------|------------|

2. Call AskUserQuestion — build parameters dynamically:

   Question 1 (always):
   ```json
   {
     "questions": [{
       "question": "Proposed [N] rules ([M] stack, [K] domain). Select which to generate:",
       "header": "Rules",
       "multiSelect": true,
       "options": "← Build dynamically: one option per proposed rule, label=rule name, description=type + path + top 3 conventions"
     }]
   }
   ```

   Question 2 (if existing rules found and not update mode) — add to same `questions` array:
   ```json
   {
     "question": "Found existing rules: [list]. How to handle?",
     "header": "Existing",
     "options": [
       {"label": "Update with new findings (Recommended)", "description": "Merge new discoveries into existing rules."},
       {"label": "Skip existing, only add new", "description": "Keep existing rules unchanged."},
       {"label": "Replace all", "description": "Regenerate all rules from scratch."}
     ]
   }
   ```
   In update mode: skip Question 2 — default to "Update with new findings" while preserving user-added lines.

   Question 3 (optional):
   - question: "Any directories or conventions I missed?"
   - header: "Extras"
   - options:
     - No extras — "Looks complete"

---

## Phase 4: Generation

1. For each approved rule, generate following `rule-creator` skill's format: frontmatter with `path:` glob, flat bullet list in imperative mood. Apply anti-slop rules from the skill.
2. Content depth by tier per `rule-creator`: Stack (10-20 lines), Domain (15-40 lines)
3. Create `.claude/rules/` directory if it doesn't exist
4. Write each file:
   - **New rule**: write directly
   - **Existing rule (update/enhance)**: read → identify user-added lines → merge: keep user-added, update auto-detected, append new → write
5. Validate per `rule-creator` skill: no CLAUDE.md duplication, no rule-to-rule duplication, line count within tier limits

---

## Phase 5: Summary

Present:

```
Generated [N] rules in .claude/rules/:

  [NEW] flutter.md      (lib/**/*.dart)               — 15 lines
  [NEW] database.md     (lib/src/database/**/*.dart)   — 30 lines
  [UPD] tests.md        (test/**/*_test.dart)          — 12 lines

Stack rules: [N]  |  Domain rules: [M]
Rules auto-inject when matching files are touched.
```

Remind: "For project-level context (commands, architecture), see `./CLAUDE.md`"
