# GitHub Actions Security Patterns

Apply these patterns to every generated workflow. Security is not optional.

## Contents

- [Action Pinning](#action-pinning)
- [Permissions](#permissions)
- [Secrets Management](#secrets-management)
- [Script Injection Prevention](#script-injection-prevention)
- [Fork PR Safety](#fork-pr-safety)
- [Concurrency Protection](#concurrency-protection)
- [Supply Chain Security](#supply-chain-security)
- [Environment Protection](#environment-protection)
- [OIDC Authentication](#oidc-authentication)
- [Workflow Security Checklist](#workflow-security-checklist)

---

## Action Pinning

**Always pin to full commit SHA.** Add a version comment for readability.

```yaml
# CORRECT: SHA-pinned with version comment
- uses: actions/checkout@b4ffde65f46336ab88eb53be808477a3936bae11  # v4.1.7
- uses: actions/setup-node@1e60f620b9541d16bece96c5465dc8ee9832be0b  # v4.0.3

# WRONG: Tag-only (mutable, can be moved by attacker)
- uses: actions/checkout@v4
- uses: actions/setup-node@v4
```

**How to find the SHA:**

```bash
# Using gh CLI
gh api repos/actions/checkout/git/ref/tags/v4 --jq '.object.sha'

# Or from the Releases page — copy the full commit SHA for the tag
```

**When generating workflows:** Use `@<sha>  # vX.Y.Z` format. If the exact SHA is unknown at generation time, use `@<sha>` as a placeholder with a comment `# TODO: pin to exact SHA` and instruct the user to resolve it.

---

## Permissions

**Default to minimal permissions.** Every workflow MUST have a `permissions:` block.

```yaml
# Workflow-level default
permissions:
  contents: read

# Escalate per-job only when needed
jobs:
  release:
    permissions:
      contents: write      # Create release
      packages: write      # Publish package
```

**Permission reference:**

| Permission | `read` | `write` | Common Use |
|-----------|--------|---------|------------|
| `contents` | Checkout code | Create release, push commits | Always needed |
| `pull-requests` | List PRs | Comment, label, merge | PR automation |
| `issues` | List issues | Comment, close, label | Issue automation |
| `packages` | Pull images | Push images/packages | Docker, npm publish |
| `id-token` | — | Fetch OIDC token | Cloud auth, npm provenance |
| `checks` | List checks | Create check runs | Status checks |
| `security-events` | List alerts | Upload SARIF | CodeQL, security scans |
| `pages` | — | Deploy Pages | GitHub Pages |
| `actions` | List runs | Cancel runs | Workflow management |
| `attestations` | — | Generate attestations | Supply chain security |
| `statuses` | List statuses | Create statuses | Commit status |

**Never use:**

```yaml
# WRONG: Overly broad
permissions: write-all

# WRONG: Missing permissions block (inherits repo defaults)
# (no permissions key at all)
```

---

## Secrets Management

### Do

```yaml
# Pass through environment variable (prevents injection)
- run: deploy --token "$DEPLOY_TOKEN"
  env:
    DEPLOY_TOKEN: ${{ secrets.DEPLOY_TOKEN }}

# Use OIDC instead of long-lived credentials
- uses: aws-actions/configure-aws-credentials@<sha>
  with:
    role-to-assume: arn:aws:iam::123456789:role/deploy
    aws-region: us-east-1
```

### Don't

```yaml
# WRONG: Inline secret in command (visible in logs, shell history)
- run: deploy --token ${{ secrets.DEPLOY_TOKEN }}

# WRONG: Structured data as secret (redaction fails)
# Store individual fields instead of JSON blobs

# WRONG: Echo secret (leaks to logs)
- run: echo ${{ secrets.API_KEY }}
```

### Masking dynamic values

```yaml
- run: |
    TOKEN=$(generate-token)
    echo "::add-mask::$TOKEN"
    echo "token=$TOKEN" >> $GITHUB_OUTPUT
```

---

## Script Injection Prevention

**Untrusted input sources:** `github.event.issue.title`, `github.event.pull_request.title`, `github.event.comment.body`, `github.event.head_commit.message`, `github.head_ref`

```yaml
# WRONG: Direct interpolation (injection risk)
- run: echo "Title: ${{ github.event.issue.title }}"

# CORRECT: Pass through environment variable
- run: echo "Title: $ISSUE_TITLE"
  env:
    ISSUE_TITLE: ${{ github.event.issue.title }}
```

---

## Fork PR Safety

```yaml
# Safe: Don't run secrets-dependent steps on fork PRs
- name: Deploy preview
  if: github.event.pull_request.head.repo.full_name == github.repository
  run: deploy-preview
  env:
    DEPLOY_TOKEN: ${{ secrets.DEPLOY_TOKEN }}
```

**Self-hosted runners:** Never use for public repositories. Fork PRs can execute arbitrary code on self-hosted runners.

---

## Concurrency Protection

```yaml
# CI: Cancel stale runs (save minutes)
concurrency:
  group: ci-${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true

# Deploy: Queue, never cancel (prevent partial deploys)
concurrency:
  group: deploy-${{ inputs.environment }}
  cancel-in-progress: false
```

---

## Supply Chain Security

### Dependabot for action updates

```yaml
# .github/dependabot.yml
version: 2
updates:
  - package-ecosystem: github-actions
    directory: /
    schedule:
      interval: weekly
    open-pull-requests-limit: 3
```

### OpenSSF Scorecard

```yaml
- uses: ossf/scorecard-action@<sha>  # v2
  with:
    results_file: results.sarif
    results_format: sarif
- uses: github/codeql-action/upload-sarif@<sha>  # v3
  with:
    sarif_file: results.sarif
```

---

## Environment Protection

Use GitHub Environments for deployment gates:

```yaml
jobs:
  deploy-prod:
    environment:
      name: production
      url: https://app.example.com
    # Requires manual approval (configured in repo settings)
    # Secrets scoped to environment only
```

Configure in repo settings:
- Required reviewers (1-6 approvers)
- Wait timer (delay before deployment starts)
- Branch restrictions (only main can deploy to production)

---

## OIDC Authentication

Prefer OIDC over long-lived credentials for cloud providers:

```yaml
permissions:
  id-token: write
  contents: read

steps:
  # AWS
  - uses: aws-actions/configure-aws-credentials@<sha>
    with:
      role-to-assume: ${{ vars.AWS_ROLE_ARN }}
      aws-region: ${{ vars.AWS_REGION }}

  # GCP
  - uses: google-github-actions/auth@<sha>
    with:
      workload_identity_provider: ${{ vars.GCP_WIF_PROVIDER }}
      service_account: ${{ vars.GCP_SA_EMAIL }}

  # Azure
  - uses: azure/login@<sha>
    with:
      client-id: ${{ vars.AZURE_CLIENT_ID }}
      tenant-id: ${{ vars.AZURE_TENANT_ID }}
      subscription-id: ${{ vars.AZURE_SUBSCRIPTION_ID }}
```

---

## Workflow Security Checklist

Apply before finalizing any workflow:

1. `permissions:` block present? Default `contents: read`?
2. All actions SHA-pinned? Version comments present?
3. No inline `${{ secrets.* }}` in `run:` steps?
4. Untrusted inputs passed through `env:`, not interpolated?
5. Fork PR steps guarded with repo ownership check?
6. Concurrency group set? Correct cancel-in-progress?
7. `timeout-minutes` set on every job?
8. OIDC used instead of long-lived cloud credentials?
9. Environment protection for production deploys?
10. Dependabot configured for `github-actions` ecosystem?
