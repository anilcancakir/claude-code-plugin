---
description: Auto-generate .claude/rules/ — path-scoped coding conventions from project analysis
argument-hint: enhance (optional, to update existing rules)
model: opus
---

# Init Project Rules

You are generating `.claude/rules/*.md` files for the active codebase. These are path-scoped instructions auto-injected when matching files are read/written/edited.

## Core Principle

> **Rules hold "how to code HERE" — CLAUDE.md holds "what this project IS".**
>
> Rules are ADDITIVE to CLAUDE.md, never duplicating it. They provide deep, domain-specific knowledge that's only relevant when touching files in that domain.

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

**Goal**: Detect tech stacks, score directories, extract conventions.

**Critical**: Use ac:explore agents for ALL research. Source code patterns always take priority over docs.

**Actions**:

1. Launch 3 ac:explore agents in a **single message** (parallel):

   ac:explore 1 — **Tech Stack Detection**:
   "CONTEXT: Generating .claude/rules/ for this project. GOAL: Detect all tech stacks. REQUEST: Find package.json, composer.json, pubspec.yaml, Cargo.toml, go.mod, pyproject.toml, Gemfile. For each: framework, version, key dependencies. Check monorepo (workspaces, packages/). Report: stack | framework | version | root path"

   ac:explore 2 — **Directory Scoring**:
   "CONTEXT: Deciding which directories need domain-level rule files. GOAL: Score directories by complexity. REQUEST: For each significant directory (depth 2-3, skip vendor/node_modules/dist/build/.git): count files + subdirs, check for own config/entry point (index.ts, **init**.py, service_provider.dart, barrel export), check for distinct patterns (contracts/, drivers/, concerns/, middleware/, migrations/). Report: directory | file count | subdir count | has entry | has patterns | total score"

   ac:explore 3 — **Convention Extraction**:
   "CONTEXT: Finding real coding conventions for rule content. GOAL: Extract actual patterns per domain. REQUEST: For each major directory, examine 3-5 source files and extract: import style, naming pattern, architectural pattern (facades, repos, controllers, middleware), API usage patterns (key methods, common chaining), anti-patterns (DO NOT/NEVER/DEPRECATED comments), domain gotchas. Also check linter configs (eslintrc, phpstan, analysis_options). PRIORITY: Source code > docs. Report: directory | conventions list | gotchas"

2. While agents run, main session gathers dedup context via Bash:

   ```bash
   ls -la .claude/rules/ 2>/dev/null
   cat CLAUDE.md 2>/dev/null | head -80
   cat ~/.claude/CLAUDE.md 2>/dev/null | head -80
   find . -maxdepth 3 -type f \( -name "*.dart" -o -name "*.php" -o -name "*.ts" -o -name "*.vue" -o -name "*.py" -o -name "*.go" -o -name "*.rs" \) | sed 's|/[^/]*$||' | sort | uniq -c | sort -rn | head -20
   ```

   - Detect existing rules → enhance mode
   - Read CLAUDE.md files for dedup reference
   - Get file distribution per directory

3. Collect all agent results
4. Merge into: stacks detected + directory scores + conventions per domain

---

## Phase 2: Scoring & Rule Planning

**Goal**: Decide which rules to create and their content.

**Actions**:

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

3. **Deduplication Algorithm**:

   For each proposed rule, check against existing sources (project CLAUDE.md, global CLAUDE.md, my-coding skill) using this 4-step process:

   1. **Exact match**: If identical text exists in any source → **skip** (already covered)
   2. **Semantic overlap**: If a broader existing rule covers this specific case → **skip** (e.g., existing "use strict types" already covers proposed "type all function parameters")
   3. **Conflict**: If proposed rule contradicts an existing rule → **flag for user decision** in Phase 3 interview (present both rules, ask which takes precedence)
   4. **Complement**: If proposed rule adds specificity to an existing broad rule → **keep** (e.g., existing "use strict types" + proposed "use backed enums for status fields" — the enum rule adds value)

   **Priority when conflicts arise**: Project-level CLAUDE.md > my-coding skill > proposed rule (most specific scope wins).

   - Compare across proposed rules → no rule-to-rule duplication

4. Present as table with type, path, score, key content after dedup

---

## Phase 3: Interactive Review

**Goal**: Get user approval on proposed rules.

**Actions**:

1. Present proposed rules table:

   | Rule | Type | Path Glob | Score | Key Points |
   |------|------|-----------|-------|------------|

2. AskUserQuestion:

   **Q1** (always): "Proposed [N] rules ([M] stack, [K] domain). Select which to generate:"
   - multiSelect with all proposed rules pre-selected
   - Each shows: type, path, line count estimate, top 3 conventions

   **Q2** (if existing rules found): "Found existing rules: [list]. How to handle?"
   - "Update with new findings" / "Skip existing, only add new" / "Replace all"

   **Q3** (optional): "Any directories or conventions I missed?"
   - Free-text

---

## Phase 4: Generation

**Goal**: Write rule files.

**Actions**:

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

2. Content depth by tier:
   - **Stack rules** (10-20 lines): import patterns, naming, general framework conventions
   - **Domain rules** (15-40 lines): can include short code examples for key API patterns, must-know method signatures, domain-specific gotchas

3. Create `.claude/rules/` directory if it doesn't exist
4. Write each file. Enhance mode: read existing → merge (no duplicates) → write
5. Validate:
   - No rule duplicates CLAUDE.md content
   - No rule-to-rule duplication
   - Line count within limits

---

## Phase 5: Summary

**Goal**: Confirm results to user.

**Actions**:

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
