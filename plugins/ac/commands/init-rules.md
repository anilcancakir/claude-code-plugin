---
description: Auto-generate .claude/rules/ — path-scoped coding conventions from project analysis. Re-run after codebase changes to update rules while preserving manually added conventions.
argument-hint: update or enhance (optional)
---

# Init Project Rules

You are generating `.claude/rules/*.md` files for the active codebase. These are path-scoped instructions auto-injected when matching files are read/written/edited.

## Core Principle

> **Rules hold "how to code HERE" — CLAUDE.md holds "what this project IS".**
>
> Rules are ADDITIVE to CLAUDE.md, never duplicating it. They provide deep, domain-specific knowledge only relevant when touching files in that domain.

## Context Layer Stack

```
Session context (every turn):
├── ~/.claude/CLAUDE.md          ← always (global workflow, identity)
├── ./CLAUDE.md                  ← always (project commands, architecture)
└── .claude/rules/<name>.md      ← ON-DEMAND when matching file touched
```

CLAUDE.md and rules are visible SIMULTANEOUSLY. Any overlap = wasted tokens.

## Two-Tier Rules

| Tier | Scope | Lines | Example |
|------|-------|-------|---------|
| **Stack** | All files of a language | 10-20 | `flutter.md` → `lib/**/*.dart` |
| **Domain** | Specific module | 15-40 | `database.md` → `lib/src/database/**/*.dart` |

Stack and domain globs can overlap — stack provides general conventions, domain adds deep API knowledge. Both inject when a domain file is touched. This is intentional.

## Anti-Slop & Dedup

**NEVER include in rules:**

- Anything in `~/.claude/CLAUDE.md`: workflow, TodoWrite, ac:plan, delegation, 3-strike, TDD process, linter rules
- Anything in `./CLAUDE.md`: commands, architecture overview, project-wide gotchas
- Anything in `~/.claude/skills/my-coding`: general coding standards
- Generic advice: "write clean code", "use descriptive names", "handle errors"
- Setup/installation steps
- Content discoverable via Glob/LS

**Rules = project-specific, path-specific, verifiable conventions only.**

---

## Phase 1: Discovery

Detect tech stacks, score directories, extract conventions. Use ac:explore agents for all research — source code always takes priority over docs.

1. Launch 3 ac:explore agents in a single message block (parallel foreground):

   ac:explore 1 — **Tech Stack Detection**:
   "CONTEXT: Generating .claude/rules/ for this project. GOAL: Detect all tech stacks. REQUEST: Find package.json, composer.json, pubspec.yaml, Cargo.toml, go.mod, pyproject.toml, Gemfile. For each: framework, version, key dependencies. Check monorepo (workspaces, packages/). Report: stack | framework | version | root path"

   ac:explore 2 — **Directory Scoring**:
   "CONTEXT: Deciding which directories need domain-level rule files. GOAL: Score directories by complexity. REQUEST: For each significant directory (depth 2-3, skip vendor/node_modules/dist/build/.git): count files + subdirs, check for own config/entry point (index.ts, **init**.py, service_provider.dart, barrel export), check for distinct patterns (contracts/, drivers/, concerns/, middleware/, migrations/). Report: directory | file count | subdir count | has entry | has patterns | total score"

   ac:explore 3 — **Convention Extraction**:
   "CONTEXT: Finding real coding conventions for rule content. GOAL: Extract actual patterns per domain. REQUEST: For each major directory, examine 3-5 source files and extract: import style, naming pattern, architectural pattern (facades, repos, controllers, middleware), API usage patterns (key methods, common chaining), anti-patterns (DO NOT/NEVER/DEPRECATED comments), domain gotchas. Also check linter configs (eslintrc, phpstan, analysis_options). PRIORITY: Source code > docs. Report: directory | conventions list | gotchas"

2. While agents run, gather dedup context:

   ```bash
   ls -la .claude/rules/ 2>/dev/null
   cat .claude/rules/*.md 2>/dev/null
   cat CLAUDE.md 2>/dev/null | head -80
   cat ~/.claude/CLAUDE.md 2>/dev/null | head -80
   find . -maxdepth 3 -type f \( -name "*.dart" -o -name "*.php" -o -name "*.ts" -o -name "*.vue" -o -name "*.py" -o -name "*.go" -o -name "*.rs" \) | sed 's|/[^/]*$||' | sort | uniq -c | sort -rn | head -20
   ```

   - If existing rules found → read each rule file fully to identify user-added vs auto-generated content
   - If `$ARGUMENTS` is "update" → mark update mode — preserve user-added conventions in existing rules, only update auto-detected patterns

3. Collect all agent results
4. Merge into: stacks detected + directory scores + conventions per domain

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

3. **Deduplication Algorithm** — for each proposed rule, check against existing sources (project CLAUDE.md, global CLAUDE.md, my-coding skill):

   1. **Exact match**: identical text in any source → **skip**
   2. **Semantic overlap**: broader existing rule covers this case → **skip** (e.g., existing "use strict types" already covers "type all function parameters")
   3. **Conflict**: proposed rule contradicts an existing rule → **flag for user decision** in Phase 3 (present both rules, ask which takes precedence)
   4. **Complement**: proposed rule adds specificity to a broad rule → **keep** (e.g., existing "use strict types" + proposed "use backed enums for status fields")

   Priority when conflicts arise: Project CLAUDE.md > my-coding skill > proposed rule (most specific scope wins).

   - Compare across proposed rules → no rule-to-rule duplication

4. Present as table with type, path, score, key content after dedup

---

## Phase 3: Interactive Review

Get user approval on proposed rules.

1. Present proposed rules table:

   | Rule | Type | Path Glob | Score | Key Points |
   |------|------|-----------|-------|------------|

2. Use AskUserQuestion to get approval:

   Question 1 (always):
   - question: "Proposed [N] rules ([M] stack, [K] domain). Select which to generate:"
   - header: "Rules"
   - multiSelect: true
   - options: Build dynamically — one option per proposed rule, each showing type, path, line count estimate, top 3 conventions. Pre-select all.

   Question 2 (if existing rules found and not update mode):
   - question: "Found existing rules: [list]. How to handle?"
   - header: "Existing"
   - options:
     - Update with new findings — "Merge new discoveries into existing rules"
     - Skip existing, only add new — "Keep existing rules unchanged"
     - Replace all — "Regenerate all rules from scratch"
   - In update mode: skip this question — default to "Update with new findings" while preserving user-added lines

   Question 3 (optional):
   - question: "Any directories or conventions I missed?"
   - header: "Extras"
   - options:
     - No extras — "Looks complete"

---

## Phase 4: Generation

1. For each approved rule, generate following format:

   ```markdown
   ---
   path: "<glob>"
   ---

   # <Domain Name>

   - <imperative convention>
   - <API pattern with inline code if needed>
   - <gotcha>
   ```

2. Content depth by tier: **Stack rules** (10-20 lines): import patterns, naming, general framework conventions. **Domain rules** (15-40 lines): short code examples, must-know method signatures, domain-specific gotchas.
3. Create `.claude/rules/` directory if it doesn't exist.
4. Write each file:
   - **New rule**: write directly
   - **Existing rule (update/enhance)**: read → identify user-added lines → merge: keep user-added lines, update auto-detected patterns, append new discoveries → write
5. Validate: no rule duplicates CLAUDE.md content, no rule-to-rule duplication, line count within limits.

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
