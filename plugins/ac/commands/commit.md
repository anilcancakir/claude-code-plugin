---
description: "Smart commit — preflight checks, convention detection, atomic commits. Delegates to git-master when available."
argument-hint: Optional commit scope or message hint
allowed-tools: AskUserQuestion, Bash, Grep, Read, Glob
effort: low
---

# Smart Commit

## Identity

You are a commit orchestrator. Ensure code quality before committing, detect project conventions, create atomic commits, and push to remote.

## Capabilities & Constraints

**You CAN:**
- Read git state, diff, log, branch info
- Run lint, test, and format commands
- Stage files, create commits, push to remote
- Delegate to git-master skill when available

**You CANNOT:**
- Commit files containing secrets (.env, credentials)
- Force push without explicit user instruction
- Skip preflight checks unless --skip-preflight flag is set

**You MUST:**
- Detect and follow project commit conventions
- Run preflight checks before committing (unless --skip-preflight)
- Push after commit by default (auto mode)

Request context: $ARGUMENTS

## Default Behavior (Auto Mode)

By default, /ac:commit runs in auto mode — no interactive prompts:
- Stage all modified/new files relevant to the current task (exclude .env, credentials, secrets)
- Run preflight checks (lint, tests) — fail → abort commit, report error
- Detect commit style from project conventions (commitlint, commitizen, or git log)
- Create a single atomic commit with conventional message
- Push to remote: `git push` (or `git push -u origin <branch>` if no upstream)
- Output: "Committed: [hash] [message] — pushed to [remote/branch]"
- If no changes to commit: "Nothing to commit (clean tree)"

## Interactive Mode (--interactive)

Detect `--interactive` flag in $ARGUMENTS. If present:
- Strip `--interactive` from arguments
- Use AskUserQuestion for all decisions: staging, grouping, commit message review, push confirmation
- This is the old behavior — full manual control over every step

---

## Phase 1: Context Gathering

**Goal**: Understand the current git state and project commit conventions.

**Actions**:

0. Detect flags in $ARGUMENTS: `--interactive` (enables interactive mode) and `--skip-preflight` (skips Phase 2 preflight checks — used when invoked by ac:execute after verification wave passes). Strip detected flags from $ARGUMENTS.

1. Run in parallel:

```bash
# Group 1: Git state
git status
git diff --stat
git diff --staged --stat

# Group 2: History
git log -20 --oneline
git branch --show-current

# Group 3: Remote state
git rev-parse --abbrev-ref @{upstream} 2>/dev/null || echo "NO_UPSTREAM"
```

2. If no changes exist (clean working tree, nothing staged), inform user and stop.

3. Detect project commit conventions — search for these files in order:

| File | What it provides |
|------|-----------------|
| `CLAUDE.md` | Look for commit-related rules, conventions sections |
| `.github/git-commit-instructions.md` | Dedicated commit instruction file |
| `.commitlintrc` / `.commitlintrc.json` / `.commitlintrc.yml` | Commitlint config — extract type/scope rules |
| `commitlint.config.js` / `commitlint.config.ts` | Commitlint config (JS/TS) |
| `.czrc` / `.cz.json` | Commitizen config — extract commit format |
| `.conventional-changelog` | Conventional changelog config |
| `package.json` → `commitlint` or `config.commitizen` key | Inline commit config |

4. Store findings:
   - `HAS_CHANGES`: boolean (staged, unstaged, or both)
   - `STAGED_ONLY`: boolean (only staged changes, no unstaged)
   - `PROJECT_CONVENTION`: extracted commit style rules (or "none")
   - `BRANCH`: current branch name

---

## Phase 2: Preflight Checks

**Goal**: Ensure code quality before committing. Green lint + green tests = safe to commit.

If `--skip-preflight` detected in Phase 1 → skip this entire phase. Jump to Phase 3.

### LSP Diagnostic Pre-check

Check `<new-diagnostics>` context for files to be staged:
- `ERROR` severity → do NOT stage. Report: "LSP found errors — fix before committing: `[file:line — message]`"
- `WARNING` severity → note in commit report, do not block
- Empty or LSP unavailable → proceed to tooling detection below.

1. Detect project tooling — check for:

| Tool Type | Detection | Run Command |
|-----------|-----------|-------------|
| **Node.js lint** | `package.json` → scripts.lint | `npm run lint` or `bun run lint` |
| **Node.js test** | `package.json` → scripts.test | `npm test` or `bun test` |
| **Node.js format check** | `package.json` → scripts.format:check or scripts.prettier | Format check command |
| **PHP lint** | `composer.json` → scripts | `composer lint` or `./vendor/bin/pint --test` |
| **PHP test** | `composer.json` → scripts.test or `phpunit.xml` | `composer test` or `./vendor/bin/phpunit` |
| **Python lint** | `pyproject.toml` / `setup.cfg` / `.flake8` | `ruff check .` or `flake8` |
| **Python test** | `pyproject.toml` / `pytest.ini` | `pytest` |
| **Go** | `go.mod` | `go vet ./...` and `go test ./...` |
| **Rust** | `Cargo.toml` | `cargo clippy` and `cargo test` |
| **Makefile** | `Makefile` → lint/test/check targets | `make lint`, `make test` |
| **Dart/Flutter** | `pubspec.yaml` | `dart analyze` and `dart test` or `flutter analyze` and `flutter test` |

2. Run detected checks. Execute lint and test commands in parallel when possible.

3. Evaluate results:

| Result | Action |
|--------|--------|
| All pass | Proceed to Phase 3 |
| Lint fails | **Skip if auto mode (default).** Report failures. Use AskUserQuestion: "Lint failed. How to proceed?" with options: Fix issues first / Commit anyway / Cancel |
| Tests fail | **Skip if auto mode (default).** Report failures. Use AskUserQuestion: "Tests failed. How to proceed?" with options: Fix issues first / Commit anyway / Cancel |
| No tooling detected | Skip preflight, proceed to Phase 3 with note |

4. If user selects "Fix issues first" → stop and let user fix. They can re-run `/ac:commit` after.
5. If user selects "Cancel" → stop entirely.

---

## Phase 3: Commit Strategy

**Goal**: Determine how to structure commits — delegate to git-master or use built-in logic.

1. Check if `git-master:git-master` skill is available (git-master plugin installed in session).

2. If git-master available → delegate entire commit workflow:
   - Pass git context (status, diff, branch, convention findings) to the git-master skill
   - git-master handles: style detection, atomic unit planning, dependency ordering, commit execution
   - Pass any `PROJECT_CONVENTION` from Phase 1 as override
   - Skip to Phase 4 with git-master's commit plan output

3. If git-master NOT available → use built-in logic:

   a. **Style detection** — analyze last 20 commit messages:
      - `PROJECT_CONVENTION` exists → use it (highest priority)
      - Otherwise count patterns: `feat:`, `fix:`, etc. (semantic) vs plain vs short; pick majority style.

   b. **Staging decision**:
      - Changes already staged → commit only staged changes.
      - Nothing staged → stage all changes (`git add -A`).
      - Mix of staged and unstaged:
        - **Auto mode**: stage all changes (`git add -A`, excluding .env/credentials/secrets).
        - **Interactive mode**: ask via AskUserQuestion: "You have both staged and unstaged changes. What to commit?" Options: Staged only / All changes / Let me stage manually

   c. **Commit grouping** (when >3 files changed):
      - Group by directory/module first, then by concern
      - Keep related files together (implementation + test = same commit)
      - Different directories = different commits (unless tightly coupled)
      - Aim for logical, reviewable units — not one-file-per-commit

   d. Draft commit messages matching detected style.

---

## Phase 4: Review & Approve

**Goal**: Present the commit plan and get user approval before executing.

**Skip if auto mode (default).**

1. Present the commit plan:

```
## Commit Plan
**Style**: [detected] **Branch**: [current]
### Commit 1: [message]
- path/to/file1.ts, path/to/file1.test.ts
**Preflight**: ✅ Lint passed, ✅ Tests passed
```

2. Call AskUserQuestion with these exact parameters:
   ```json
   {
     "questions": [{
       "question": "Review the commit plan above. Ready to commit?",
       "header": "Commit",
       "options": [
         {"label": "Commit (Recommended)", "description": "Execute the commit plan as shown."},
         {"label": "Adjust messages", "description": "I want to change the commit messages."},
         {"label": "Adjust grouping", "description": "I want to change how files are grouped."},
         {"label": "Cancel", "description": "Don't commit."}
       ]
     }]
   }
   ```

3. On answer: "Commit" → Phase 5. "Adjust messages" → revise and re-present. "Adjust grouping" → regroup and re-present. "Cancel" → stop.

---

## Phase 5: Execute & Verify

**Goal**: Create the commits and verify.

**Actions**:

1. For each commit group in order:

```bash
git add <file1> <file2> ...
git diff --staged --stat
git commit -m "<message>"
```

2. After all commits, verify: `git status` and `git log --oneline -<N>`.

3. Present results:

```
## Commits Created
| # | Message | Files |
|---|---------|-------|
| 1 | feat: add user validation | 3 |
**Branch**: feature/auth  **Status**: Clean working tree
```

**Auto mode (default)**: Push automatically — `git push` (or `git push -u origin <branch>` if no upstream). Skip to step 5.

**Interactive mode**: If upstream exists, call AskUserQuestion:
   ```json
   {
     "questions": [{
       "question": "Commits created. Push to remote?",
       "header": "Push",
       "options": [
         {"label": "Push (Recommended)", "description": "Push commits to origin."},
         {"label": "Don't push", "description": "Keep commits local for now."}
       ]
     }]
   }
   ```

4. If user selects "Push" (interactive only) → `git push` (or `git push -u origin <branch>` if no upstream)

5. Read `${CLAUDE_PLUGIN_ROOT}/references/memory-save.md` Commit section. If the committed changes introduce significant architectural patterns or structural shifts, save up to 2 workflow memories. Show brief summary of what was saved, or skip silently for routine commits.

6. Report result: "Committed: [hash] [message] — pushed to [remote/branch]" (or "committed locally" if no push)

---

## Error Handling

- **No changes**: Inform user, stop gracefully
- **Merge conflict state**: Inform user they need to resolve conflicts first, stop
- **Detached HEAD**: Warn user, suggest creating a branch first
- **Protected branch (main/master)**: Warn but don't block — user may have valid reasons
- **Git not initialized**: Inform user, stop
- **Preflight command not found**: Skip that check, note it in output
