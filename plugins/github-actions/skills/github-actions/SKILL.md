---
name: github-actions
description: "GitHub Actions workflow generator — CI/CD pipelines, releases, Docker builds, reusable workflows, composite actions, dependabot. Use for .github/workflows/ generation, debugging, and security hardening."
when_to_use: "Use when the user asks to 'create a CI pipeline', 'add GitHub Actions', 'set up CD', 'create a release workflow', 'build Docker in CI', 'fix my workflow', or mentions .github/workflows/, action.yml, dependabot.yml, workflow_dispatch, or CI/CD automation. Also trigger when debugging failing GitHub Actions runs."
---

# GitHub Actions Workflow Generator

Generate production-ready GitHub Actions workflow YAML files. Supports CI, CD, releases, Docker, reusable workflows, composite actions, and dependabot configs across multiple languages and frameworks.

## Principles

- **Secure by default**: Pin actions to SHA, minimal permissions, no hardcoded secrets
- **Cache everything**: Dependencies, build artifacts, Docker layers — always cache
- **Fail fast, fail clear**: Matrix `fail-fast: true` for CI, `false` for releases
- **Concurrency control**: Always add concurrency groups for push/PR workflows
- **DRY workflows**: Extract shared logic into reusable workflows or composite actions

---

## MODE DETECTION (FIRST STEP)

Analyze the user's request to determine workflow type:

| Request Pattern | Mode | Jump To |
|----------------|------|---------|
| "CI", "test", "lint", "check" | `CI` | Phase 1–5 |
| "deploy", "CD", "release to" | `DEPLOY` | Phase 1–5 |
| "release", "publish", "tag" | `RELEASE` | Phase 1–5 |
| "Docker", "container", "image" | `DOCKER` | Phase 1–5 |
| "reusable workflow", "shared workflow" | `REUSABLE` | Phase 1–5 |
| "composite action", "custom action" | `COMPOSITE` | Phase 1–5 |
| "dependabot", "renovate", "dependency updates" | `DEPENDENCY` | Phase 1–5 |
| "fix workflow", "workflow failing" | `DEBUG` | Debug Flow |

---

## Phase 1: Project Detection (PARALLEL)

Execute ALL in parallel:

```bash
# Group 1: Language detection
ls composer.json package.json pubspec.yaml go.mod Cargo.toml pyproject.toml setup.py requirements.txt Gemfile pom.xml build.gradle 2>/dev/null

# Group 2: Framework detection
ls artisan next.config.* nuxt.config.* angular.json vite.config.* 2>/dev/null
cat composer.json 2>/dev/null | head -20
cat package.json 2>/dev/null | head -20

# Group 3: Existing workflows
ls .github/workflows/*.yml .github/workflows/*.yaml 2>/dev/null
ls .github/actions/*/action.yml 2>/dev/null
cat .github/dependabot.yml 2>/dev/null

# Group 4: CI tooling
ls .php-cs-fixer.dist.php phpstan.neon pint.json eslint.config.* .eslintrc* biome.json analysis_options.yaml .golangci.yml .flake8 pyproject.toml 2>/dev/null

# Group 5: Docker context
ls Dockerfile docker-compose.yml docker-compose.yaml 2>/dev/null
```

**Mandatory output:**

```
PROJECT DETECTION
=================
Language: [PHP 8.x | Dart/Flutter | Node.js | Bun | Go | Python | Rust | Java | Multi-stack]
Framework: [Laravel | Next.js | Flutter | Express | FastAPI | None | ...]
Package manager: [composer | npm | pnpm | yarn | bun | pub | go mod | pip | cargo]
Linter: [pint | eslint | biome | golangci-lint | ruff | dart analyze | none]
Test runner: [phpunit | artisan test | jest | vitest | bun test | flutter test | go test | pytest]
Docker: [yes | no]
Existing workflows: [list or none]
```

---

## Phase 2: Template Selection

Select the base template from `references/language-templates.md` based on detected stack. Read the reference file for the matching language section.

**Multi-stack projects:** Generate separate jobs per language within one workflow, using `defaults.run.working-directory` to isolate contexts.

---

## Phase 3: Security Hardening

Apply ALL of these to every generated workflow. Read `references/security-patterns.md` for detailed patterns.

**Non-negotiable rules:**

1. **Pin actions to SHA** — `uses: actions/checkout@<sha>` with version comment
2. **Minimal permissions** — `permissions:` block on every workflow, default `contents: read`
3. **Concurrency groups** — Prevent duplicate runs on force-push
4. **No inline secrets** — Always `${{ secrets.NAME }}`, never hardcoded
5. **Validate inputs** — `workflow_dispatch` inputs must have types and descriptions

**Permission mapping:**

| Operation | Required Permissions |
|-----------|---------------------|
| Read code only | `contents: read` |
| Push commits | `contents: write` |
| Comment on PR | `pull-requests: write` |
| Create release | `contents: write` |
| Publish package | `packages: write`, `id-token: write` (OIDC) |
| Deploy Pages | `pages: write`, `id-token: write` |
| Upload coverage | `contents: read` (only) |
| Create check | `checks: write` |
| Security scan | `security-events: write` |

---

## Phase 4: Workflow Generation (BLOCKING OUTPUT)

Present the complete workflow YAML. Consult `references/workflow-syntax.md` for exact syntax of triggers, expressions, contexts, and runners. Follow the structure order:

```yaml
name:                    # Clear, descriptive name
on:                      # Triggers with filters
permissions:             # Minimal required
concurrency:             # Prevent duplicates
env:                     # Shared environment variables
defaults:                # Working directory, shell
jobs:                    # Job definitions
  job-name:
    runs-on:             # Runner selection
    timeout-minutes:     # Always set
    services:            # Database, cache containers
    strategy:            # Matrix builds
    env:                 # Job-level env
    steps:               # Step sequence
```

**Step ordering within a job:**

```
1. Checkout code
2. Setup language runtime (with cache)
3. Install dependencies (cached)
4. Lint / static analysis
5. Build (if needed)
6. Test (with coverage)
7. Upload artifacts / coverage
8. Deploy / publish (conditional)
9. Notify (on failure)
```

**Mandatory output:**

```yaml
# Generated workflow with inline comments explaining:
# - Why each permission is needed
# - What each concurrency group prevents
# - Why specific actions are chosen
# - Cache strategy rationale
```

---

## Phase 5: Verification

After writing the workflow file:

1. Validate YAML syntax — `yq eval '.' .github/workflows/<file>.yml > /dev/null`
2. Check action versions — verify SHA pins match expected versions
3. Verify no hardcoded secrets — grep for patterns like `ghp_`, `sk-`, `Bearer`
4. Confirm permissions are minimal — no `write-all` or missing `permissions:` block
5. Test trigger logic — verify branch filters match project's branching strategy

---

## Debug Flow

When fixing broken workflows:

1. Read the workflow file
2. Run `gh run list --workflow=<name>.yml --limit 5` to find recent failures
3. Run `gh run view <id> --log-failed` to get error details
4. Classify: syntax error, action version issue, permission issue, runtime failure
5. Fix and verify

---

## Trigger Patterns

### CI (push + PR)

```yaml
on:
  push:
    branches: [main, master, develop]
  pull_request:
    branches: [main, master, develop]
```

### CI with path filtering (monorepo)

```yaml
on:
  push:
    branches: [main]
    paths:
      - 'packages/api/**'
      - '.github/workflows/api-ci.yml'
  pull_request:
    paths:
      - 'packages/api/**'
```

### Deploy (manual + push)

```yaml
on:
  workflow_dispatch:
    inputs:
      environment:
        description: 'Target environment'
        required: true
        type: choice
        options: [staging, production]
  push:
    branches: [main]
```

### Release (tag)

```yaml
on:
  push:
    tags: ['v*.*.*']
```

### Scheduled

```yaml
on:
  schedule:
    - cron: '0 4 * * 1'  # Every Monday 4AM UTC
```

### Reusable (called by other workflows)

```yaml
on:
  workflow_call:
    inputs:
      environment:
        required: true
        type: string
    secrets:
      DEPLOY_KEY:
        required: true
```

---

## Concurrency Patterns

```yaml
# CI: Cancel outdated runs on same branch
concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true

# Deploy: Never cancel, queue instead
concurrency:
  group: deploy-${{ inputs.environment }}
  cancel-in-progress: false
```

---

## Service Container Patterns

```yaml
services:
  postgres:
    image: postgres:17
    env:
      POSTGRES_DB: testing
      POSTGRES_USER: test
      POSTGRES_PASSWORD: test
    ports:
      - 5432:5432
    options: >-
      --health-cmd="pg_isready"
      --health-interval=10s
      --health-timeout=5s
      --health-retries=5

  redis:
    image: redis:7-alpine
    ports:
      - 6379:6379
    options: >-
      --health-cmd="redis-cli ping"
      --health-interval=10s
      --health-timeout=5s
      --health-retries=5
```

---

## Artifact & Caching Patterns

```yaml
# Dependency caching (built into setup-* actions)
- uses: actions/setup-node@<sha>  # v4
  with:
    node-version-file: '.nvmrc'
    cache: 'npm'

# Manual cache (for custom paths)
- uses: actions/cache@<sha>  # v4
  with:
    path: ~/.pub-cache
    key: ${{ runner.os }}-pub-${{ hashFiles('**/pubspec.lock') }}
    restore-keys: ${{ runner.os }}-pub-

# Upload test artifacts
- uses: actions/upload-artifact@<sha>  # v4
  if: failure()
  with:
    name: test-results
    path: test-results/
    retention-days: 7

# Upload coverage
- uses: codecov/codecov-action@<sha>  # v5
  with:
    files: coverage/lcov.info
    fail_ci_if_error: false
```

---

## Matrix Strategies

```yaml
# Node.js version matrix
strategy:
  fail-fast: true
  matrix:
    node-version: [18, 20, 22]

# Platform matrix
strategy:
  fail-fast: false
  matrix:
    os: [ubuntu-latest, macos-latest, windows-latest]

# Complex matrix with includes/excludes
strategy:
  matrix:
    os: [ubuntu-latest, macos-latest]
    node: [18, 20]
    include:
      - os: ubuntu-latest
        node: 22
    exclude:
      - os: macos-latest
        node: 18
```

---

## Integration with Other Skills

- **git-master**: Commit workflow file changes following detected commit style. Use `git-master` for the commit, not raw `git commit`.
- **github-cli**: Use `gh` commands for workflow debugging (`gh run view`, `gh run list`), secret management (`gh secret set`), and variable management (`gh variable set`).

---

## Anti-Patterns

- Unpinned actions (`uses: actions/checkout@v4`) → Pin to SHA with version comment
- Missing `permissions:` block → Always declare, default `contents: read`
- No concurrency group → Duplicate runs waste minutes
- `runs-on: ubuntu-latest` without `timeout-minutes` → Set 15–30 min for CI
- Hardcoded versions in `run:` steps → Use matrix or env vars
- `npm install` instead of `npm ci` → Use lockfile-based install
- Missing `if: failure()` on artifact upload → Only upload on failure
- `continue-on-error: true` on tests → Tests must fail the build
- `write-all` permissions → Declare only what's needed
- `--force` in deploy scripts → Use `--force-with-lease` or idempotent deploys

---

## References

For detailed guidance on specific topics, read `references/` when needed:

| Topic | File | Covers |
|-------|------|--------|
| YAML syntax | [workflow-syntax.md](references/workflow-syntax.md) | Top-level keys, triggers, jobs, steps, expressions, contexts, runners, composite actions |
| Language templates | [language-templates.md](references/language-templates.md) | PHP/Laravel, Dart/Flutter, Node.js/Bun, Go, Python, Docker, multi-stack, dependabot |
| Security patterns | [security-patterns.md](references/security-patterns.md) | Action pinning, permissions, secrets, injection prevention, OIDC, supply chain, checklist |
