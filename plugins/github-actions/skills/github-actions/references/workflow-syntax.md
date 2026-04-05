# GitHub Actions Workflow Syntax Reference

Complete syntax reference for `.github/workflows/*.yml` files.

## Contents

- [Top-Level Keys](#top-level-keys)
- [Trigger Events (`on:`)](#trigger-events-on)
- [Job Configuration](#job-configuration)
- [Step Configuration](#step-configuration)
- [Expressions & Contexts](#expressions--contexts)
- [Runners](#runners)
- [Reusable Workflow Call](#reusable-workflow-call)
- [Composite Action (action.yml)](#composite-action-actionyml)
- [Output Patterns](#output-patterns)
- [Environment Variables](#environment-variables)

---

## Top-Level Keys

```yaml
name: string                     # Workflow name (displayed in Actions tab)
run-name: string                 # Dynamic run name (${{ github.actor }}, ${{ inputs.x }})

on:                              # Trigger events (required)
  push: ...
  pull_request: ...

permissions:                     # GITHUB_TOKEN permissions (workflow-level)
  contents: read

env:                             # Environment variables (all jobs)
  NODE_ENV: production

defaults:                        # Default settings for all jobs
  run:
    shell: bash
    working-directory: ./app

concurrency:                     # Concurrency control
  group: string
  cancel-in-progress: boolean

jobs:                            # Job definitions (required)
  job-id: ...
```

---

## Trigger Events (`on:`)

### Push / Pull Request

```yaml
on:
  push:
    branches: [main, 'releases/**']
    branches-ignore: ['feature/**']
    tags: ['v*.*.*']
    tags-ignore: ['v*-beta']
    paths: ['src/**', '*.js']
    paths-ignore: ['docs/**', '*.md']

  pull_request:
    branches: [main]
    types: [opened, synchronize, reopened, ready_for_review]
    paths: ['src/**']

  pull_request_target:           # Runs in context of BASE branch (security-sensitive)
    types: [opened, synchronize, reopened]
```

### Manual & Scheduled

```yaml
on:
  workflow_dispatch:
    inputs:
      environment:
        description: 'Deploy target'
        required: true
        type: choice
        options: [staging, production]
      debug:
        description: 'Enable debug logging'
        type: boolean
        default: false
      version:
        description: 'Version override'
        type: string
      deploy_group:
        description: 'Target environment'
        type: environment
        required: true

  schedule:
    - cron: '30 5 * * 1,3'      # Min Hour Day Month Weekday (UTC)
```

### Reusable Workflow

```yaml
on:
  workflow_call:
    inputs:
      environment:
        required: true
        type: string
        description: 'Deploy target'
      version:
        required: false
        type: string
        default: 'latest'
    outputs:
      deploy_url:
        description: 'Deployed URL'
        value: ${{ jobs.deploy.outputs.url }}
    secrets:
      DEPLOY_KEY:
        required: true
      API_TOKEN:
        required: false
```

### Other Events

```yaml
on:
  release:
    types: [published, created, released]

  repository_dispatch:
    types: [deploy, webhook-event]

  issue_comment:
    types: [created]

  issues:
    types: [opened, labeled]

  deployment_status: {}

  workflow_run:
    workflows: ["CI"]
    types: [completed]
    branches: [main]
```

---

## Job Configuration

```yaml
jobs:
  build:
    name: 'Build (${{ matrix.os }})'    # Display name
    runs-on: ubuntu-latest               # Runner
    timeout-minutes: 30                  # Hard timeout
    needs: [lint, test]                  # Job dependencies
    if: github.event_name == 'push'      # Conditional execution

    permissions:                         # Job-level permissions
      contents: read
      packages: write

    environment:                         # Deployment environment
      name: production
      url: ${{ steps.deploy.outputs.url }}

    concurrency:
      group: deploy-${{ github.ref }}
      cancel-in-progress: false

    defaults:
      run:
        shell: bash
        working-directory: ./app

    env:
      DATABASE_URL: postgres://test:test@localhost:5432/test

    outputs:
      version: ${{ steps.version.outputs.value }}

    services:                            # Sidecar containers
      db:
        image: postgres:17
        env:
          POSTGRES_PASSWORD: test
        ports: ['5432:5432']
        options: --health-cmd="pg_isready" --health-interval=10s

    strategy:
      fail-fast: true
      max-parallel: 3
      matrix:
        node: [18, 20, 22]
        os: [ubuntu-latest, macos-latest]
        include:
          - node: 22
            os: ubuntu-latest
            coverage: true
        exclude:
          - node: 18
            os: macos-latest

    container:                           # Run job inside container
      image: node:22-alpine
      credentials:
        username: ${{ github.actor }}
        password: ${{ secrets.GITHUB_TOKEN }}
      env:
        NODE_ENV: test
      volumes:
        - my_docker_volume:/volume_mount
      options: --cpus 2

    steps: [...]
```

---

## Step Configuration

```yaml
steps:
  - name: 'Checkout'                     # Display name
    id: checkout                          # Reference ID
    uses: actions/checkout@<sha>          # Action reference
    with:                                 # Action inputs
      fetch-depth: 0
      token: ${{ secrets.PAT }}
    env:                                  # Step environment
      GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
    if: success()                         # Conditional
    continue-on-error: false              # Fail step but continue job
    timeout-minutes: 10                   # Step timeout
    working-directory: ./app              # Override default

  - name: 'Run tests'
    run: |                                # Shell command (multi-line)
      npm ci
      npm test
    shell: bash                           # Shell override
```

### Action Reference Formats

```yaml
uses: actions/checkout@abc123def456       # SHA-pinned (recommended)
uses: actions/checkout@v4                 # Tag (convenient but mutable)
uses: owner/repo/path@ref                # Subdirectory action
uses: ./.github/actions/my-action        # Local action
uses: docker://alpine:3.18               # Docker image
uses: owner/repo/.github/workflows/reusable.yml@main  # Reusable workflow
```

---

## Expressions & Contexts

### Syntax

```yaml
${{ <expression> }}

# In `if:` conditions, ${{ }} is optional:
if: github.ref == 'refs/heads/main'
if: ${{ github.ref == 'refs/heads/main' }}   # Equivalent
```

### Contexts

| Context | Description | Example |
|---------|-------------|---------|
| `github` | Workflow run info | `github.sha`, `github.ref_name`, `github.actor` |
| `env` | Environment variables | `env.NODE_ENV` |
| `vars` | Repository/org variables | `vars.DEPLOY_URL` |
| `secrets` | Encrypted secrets | `secrets.API_KEY` |
| `job` | Current job info | `job.status` |
| `steps` | Completed step outputs | `steps.build.outputs.version` |
| `matrix` | Matrix values | `matrix.node`, `matrix.os` |
| `needs` | Dependent job outputs | `needs.build.outputs.version` |
| `inputs` | Workflow inputs | `inputs.environment` |
| `runner` | Runner info | `runner.os`, `runner.arch`, `runner.temp` |
| `strategy` | Matrix strategy | `strategy.job-index`, `strategy.job-total` |

### Functions

| Function | Signature | Description |
|----------|-----------|-------------|
| `contains` | `contains(search, item)` | Case-insensitive search in string/array |
| `startsWith` | `startsWith(str, value)` | Case-insensitive prefix check |
| `endsWith` | `endsWith(str, value)` | Case-insensitive suffix check |
| `format` | `format(str, ...args)` | Replace `{0}`, `{1}` placeholders |
| `join` | `join(array, sep?)` | Concatenate array (default comma) |
| `toJSON` | `toJSON(value)` | Pretty-print JSON |
| `fromJSON` | `fromJSON(str)` | Parse JSON string to object/type |
| `hashFiles` | `hashFiles(pattern)` | SHA-256 hash of matching files |
| `success` | `success()` | All previous steps succeeded |
| `failure` | `failure()` | Any previous step failed |
| `always` | `always()` | Always execute (even cancelled) |
| `cancelled` | `cancelled()` | Workflow was cancelled |

### Operators

```
==  !=  <  >  <=  >=  &&  ||  !
```

### Common Expression Patterns

```yaml
# Conditional on event
if: github.event_name == 'push'

# Conditional on branch
if: github.ref == 'refs/heads/main'

# Conditional on matrix value
if: matrix.node == 22

# Conditional on previous job
if: needs.test.result == 'success'

# Conditional on input
if: inputs.environment == 'production'

# Boolean input check
if: inputs.debug == true

# Contains check
if: contains(github.event.head_commit.message, '[skip ci]')

# Not cancelled (safer than always())
if: '!cancelled()'

# Run on failure only
if: failure()

# Dynamic runner selection
runs-on: ${{ matrix.os == 'windows' && 'windows-latest' || 'ubuntu-latest' }}
```

---

## Runners

| Label | OS | Architecture |
|-------|-----|-------------|
| `ubuntu-latest` | Ubuntu 24.04 | x64 |
| `ubuntu-22.04` | Ubuntu 22.04 | x64 |
| `macos-latest` | macOS 15 (Sequoia) | arm64 |
| `macos-13` | macOS 13 (Ventura) | x64 |
| `windows-latest` | Windows Server 2022 | x64 |
| `self-hosted` | Custom | Custom |

### Self-hosted labels

```yaml
runs-on: [self-hosted, linux, x64, gpu]
```

---

## Reusable Workflow Call

```yaml
jobs:
  deploy:
    uses: org/repo/.github/workflows/deploy.yml@main
    with:
      environment: production
      version: ${{ needs.build.outputs.version }}
    secrets: inherit                     # Pass all secrets
    # OR
    secrets:
      DEPLOY_KEY: ${{ secrets.DEPLOY_KEY }}
```

---

## Composite Action (action.yml)

```yaml
name: 'Setup and Test'
description: 'Install deps and run tests'
inputs:
  node-version:
    description: 'Node.js version'
    required: false
    default: '22'
outputs:
  coverage:
    description: 'Coverage percentage'
    value: ${{ steps.test.outputs.coverage }}
runs:
  using: 'composite'
  steps:
    - uses: actions/setup-node@<sha>
      with:
        node-version: ${{ inputs.node-version }}
        cache: npm

    - run: npm ci
      shell: bash

    - id: test
      run: |
        npm test -- --coverage 2>&1 | tee output.txt
        echo "coverage=$(grep 'All files' output.txt | awk '{print $4}')" >> $GITHUB_OUTPUT
      shell: bash
```

---

## Output Patterns

### Set step output

```yaml
- id: version
  run: echo "value=$(cat VERSION)" >> $GITHUB_OUTPUT

# Multi-line output
- id: changelog
  run: |
    {
      echo 'notes<<EOF'
      cat CHANGELOG.md
      echo 'EOF'
    } >> $GITHUB_OUTPUT
```

### Set job output

```yaml
jobs:
  build:
    outputs:
      version: ${{ steps.version.outputs.value }}
```

### Read in downstream job

```yaml
jobs:
  deploy:
    needs: build
    steps:
      - run: echo "Deploying ${{ needs.build.outputs.version }}"
```

---

## Environment Variables

```yaml
# Workflow-level
env:
  NODE_ENV: production

# Job-level
jobs:
  test:
    env:
      DATABASE_URL: postgres://localhost/test

# Step-level
steps:
  - run: echo "$MY_VAR"
    env:
      MY_VAR: ${{ secrets.API_KEY }}

# Dynamic (set in step, use later)
- run: echo "VERSION=1.2.3" >> $GITHUB_ENV
- run: echo "Deploying $VERSION"

# Add to PATH
- run: echo "$HOME/.local/bin" >> $GITHUB_PATH
```
