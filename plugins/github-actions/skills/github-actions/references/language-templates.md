# Language-Specific Workflow Templates

Ready-to-use workflow patterns per language/framework. Each template includes CI, deploy, and release variants.

Read the section matching the detected project language. Adapt — do not copy verbatim.

## Contents

- [PHP / Laravel](#php--laravel) — CI, Deploy
- [Dart / Flutter](#dart--flutter) — CI (Library), CI (App), Publish (pub.dev)
- [Node.js / Bun](#nodejs--bun) — CI (Node), CI (Bun), Publish (npm)
- [Go](#go) — CI, Release (GoReleaser)
- [Python](#python) — CI, Publish (PyPI)
- [Docker](#docker) — Build & Push (GHCR, multi-platform)
- [Multi-Stack](#multi-stack-php--node--flutter) — Combined PHP + Node + Flutter
- [Dependabot Configuration](#dependabot-configuration) — All ecosystems

---

## PHP / Laravel

### CI

```yaml
name: CI

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

permissions:
  contents: read

concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true

env:
  PHP_VERSION: '8.4'

jobs:
  test:
    runs-on: ubuntu-latest
    timeout-minutes: 15

    services:
      postgres:
        image: postgres:17
        env:
          POSTGRES_DB: testing
          POSTGRES_USER: test
          POSTGRES_PASSWORD: test
        ports: ['5432:5432']
        options: >-
          --health-cmd="pg_isready"
          --health-interval=10s
          --health-timeout=5s
          --health-retries=5

      redis:
        image: redis:7-alpine
        ports: ['6379:6379']
        options: >-
          --health-cmd="redis-cli ping"
          --health-interval=10s
          --health-timeout=5s
          --health-retries=5

    steps:
      - uses: actions/checkout@<sha>  # v4

      - uses: shivammathur/setup-php@<sha>  # v2
        with:
          php-version: ${{ env.PHP_VERSION }}
          extensions: pdo_pgsql, redis
          coverage: xdebug

      - name: Install dependencies
        run: composer install --prefer-dist --no-progress --no-interaction

      - name: Lint (Pint)
        run: vendor/bin/pint --test

      - name: Static analysis (PHPStan)
        run: vendor/bin/phpstan analyse --no-progress

      - name: Prepare environment
        run: |
          cp .env.testing .env
          php artisan key:generate
          php artisan migrate --force

      - name: Run tests
        run: php artisan test --parallel --coverage-clover=coverage.xml
        env:
          DB_CONNECTION: pgsql
          DB_HOST: localhost
          DB_PORT: 5432
          DB_DATABASE: testing
          DB_USERNAME: test
          DB_PASSWORD: test
          REDIS_HOST: localhost
          REDIS_PORT: 6379

      - uses: codecov/codecov-action@<sha>  # v5
        if: github.event_name == 'push'
        with:
          files: coverage.xml
          fail_ci_if_error: false
```

### Deploy (Laravel)

```yaml
name: Deploy

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

permissions:
  contents: read

concurrency:
  group: deploy-${{ inputs.environment || 'production' }}
  cancel-in-progress: false

jobs:
  test:
    # ... (same as CI test job)

  deploy:
    needs: test
    runs-on: ubuntu-latest
    timeout-minutes: 10
    environment:
      name: ${{ inputs.environment || 'production' }}

    steps:
      - uses: actions/checkout@<sha>  # v4

      # Deploy method varies: SSH, Forge, Vapor, Envoyer
      - name: Deploy
        run: |
          # Example: Laravel Forge deploy trigger
          curl -X POST "${{ secrets.FORGE_DEPLOY_URL }}"

      - name: Run migrations
        run: |
          # SSH to server and run migrations
          ssh deploy@${{ vars.SERVER_IP }} "cd /var/www && php artisan migrate --force"

      - name: Sentry release
        uses: getsentry/action-release@<sha>  # v3
        if: inputs.environment == 'production'
        env:
          SENTRY_AUTH_TOKEN: ${{ secrets.SENTRY_AUTH_TOKEN }}
          SENTRY_ORG: ${{ vars.SENTRY_ORG }}
          SENTRY_PROJECT: ${{ vars.SENTRY_PROJECT }}
        with:
          environment: ${{ inputs.environment }}
          set_commits: auto
```

---

## Dart / Flutter

### CI (Library)

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

permissions:
  contents: read

concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true

jobs:
  test:
    runs-on: ubuntu-latest
    timeout-minutes: 15

    steps:
      - uses: actions/checkout@<sha>  # v4

      - uses: subosito/flutter-action@<sha>  # v2
        with:
          channel: stable
          cache: true

      - run: flutter pub get

      - name: Analyze
        run: dart analyze --fatal-infos

      - name: Format check
        run: dart format --set-exit-if-changed .

      - name: Test
        run: flutter test --coverage

      - uses: codecov/codecov-action@<sha>  # v5
        with:
          files: coverage/lcov.info
          fail_ci_if_error: false
```

### CI (App — Web + Mobile)

```yaml
name: CI

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

permissions:
  contents: read

concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true

jobs:
  analyze:
    runs-on: ubuntu-latest
    timeout-minutes: 10
    steps:
      - uses: actions/checkout@<sha>  # v4
      - uses: subosito/flutter-action@<sha>  # v2
        with:
          channel: stable
          cache: true
      - run: flutter pub get
      - run: dart analyze --fatal-infos
      - run: dart format --set-exit-if-changed .

  test:
    runs-on: ubuntu-latest
    timeout-minutes: 15
    steps:
      - uses: actions/checkout@<sha>  # v4
      - uses: subosito/flutter-action@<sha>  # v2
        with:
          channel: stable
          cache: true
      - run: flutter pub get
      - run: flutter test --coverage
      - uses: codecov/codecov-action@<sha>  # v5
        with:
          files: coverage/lcov.info

  build-web:
    needs: [analyze, test]
    runs-on: ubuntu-latest
    timeout-minutes: 15
    if: github.event_name == 'push' && github.ref == 'refs/heads/main'
    steps:
      - uses: actions/checkout@<sha>  # v4
      - uses: subosito/flutter-action@<sha>  # v2
        with:
          channel: stable
          cache: true
      - run: flutter pub get
      - run: flutter build web --release
      - uses: actions/upload-artifact@<sha>  # v4
        with:
          name: web-build
          path: build/web/
          retention-days: 7
```

### Publish (pub.dev)

```yaml
name: Publish

on:
  push:
    tags: ['v*.*.*']

permissions:
  contents: read

jobs:
  publish:
    uses: dart-lang/setup-dart/.github/workflows/publish.yml@v1
    # OR manual:
    # steps:
    #   - uses: actions/checkout@<sha>
    #   - uses: dart-lang/setup-dart@<sha>
    #   - run: dart pub publish --force
```

---

## Node.js / Bun

### CI (Node.js)

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

permissions:
  contents: read

concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true

jobs:
  test:
    runs-on: ubuntu-latest
    timeout-minutes: 15
    strategy:
      fail-fast: true
      matrix:
        node-version: [18, 20, 22]

    steps:
      - uses: actions/checkout@<sha>  # v4

      - uses: actions/setup-node@<sha>  # v4
        with:
          node-version: ${{ matrix.node-version }}
          cache: npm

      - run: npm ci
      - run: npm run build
      - run: npm test

      - uses: codecov/codecov-action@<sha>  # v5
        if: matrix.node-version == 22
        with:
          files: coverage/lcov.info
          fail_ci_if_error: false
```

### CI (Bun)

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

permissions:
  contents: read

concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true

jobs:
  test:
    runs-on: ubuntu-latest
    timeout-minutes: 15

    steps:
      - uses: actions/checkout@<sha>  # v4

      - uses: oven-sh/setup-bun@<sha>  # v2
        with:
          bun-version: latest

      - run: bun install --frozen-lockfile
      - run: bun run build
      - run: bun test

  typecheck:
    runs-on: ubuntu-latest
    timeout-minutes: 10
    steps:
      - uses: actions/checkout@<sha>  # v4
      - uses: oven-sh/setup-bun@<sha>  # v2
      - run: bun install --frozen-lockfile
      - run: bun run typecheck
```

### Publish (npm)

```yaml
name: Publish

on:
  push:
    tags: ['v*.*.*']

permissions:
  contents: read
  id-token: write    # npm provenance

jobs:
  publish:
    runs-on: ubuntu-latest
    timeout-minutes: 10
    steps:
      - uses: actions/checkout@<sha>  # v4

      - uses: actions/setup-node@<sha>  # v4
        with:
          node-version: 22
          registry-url: 'https://registry.npmjs.org'

      - run: npm ci
      - run: npm run build
      - run: npm publish --provenance --access public
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
```

---

## Go

### CI

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

permissions:
  contents: read

concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true

jobs:
  test:
    runs-on: ubuntu-latest
    timeout-minutes: 15

    steps:
      - uses: actions/checkout@<sha>  # v4

      - uses: actions/setup-go@<sha>  # v5
        with:
          go-version-file: go.mod
          cache: true

      - name: Lint
        uses: golangci/golangci-lint-action@<sha>  # v6
        with:
          version: latest

      - name: Test
        run: go test -v -race -coverprofile=coverage.out ./...

      - uses: codecov/codecov-action@<sha>  # v5
        with:
          files: coverage.out

  build:
    needs: test
    runs-on: ubuntu-latest
    timeout-minutes: 10
    steps:
      - uses: actions/checkout@<sha>  # v4
      - uses: actions/setup-go@<sha>  # v5
        with:
          go-version-file: go.mod
          cache: true
      - run: go build -v ./...
```

### Release (GoReleaser)

```yaml
name: Release

on:
  push:
    tags: ['v*.*.*']

permissions:
  contents: write    # Create release

jobs:
  release:
    runs-on: ubuntu-latest
    timeout-minutes: 30
    steps:
      - uses: actions/checkout@<sha>  # v4
        with:
          fetch-depth: 0

      - uses: actions/setup-go@<sha>  # v5
        with:
          go-version-file: go.mod

      - uses: goreleaser/goreleaser-action@<sha>  # v6
        with:
          version: latest
          args: release --clean
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

---

## Python

### CI

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

permissions:
  contents: read

concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true

jobs:
  test:
    runs-on: ubuntu-latest
    timeout-minutes: 15
    strategy:
      matrix:
        python-version: ['3.11', '3.12', '3.13']

    steps:
      - uses: actions/checkout@<sha>  # v4

      - uses: actions/setup-python@<sha>  # v5
        with:
          python-version: ${{ matrix.python-version }}
          cache: pip

      - run: pip install -e ".[dev]"

      - name: Lint
        run: ruff check .

      - name: Format check
        run: ruff format --check .

      - name: Type check
        run: mypy .

      - name: Test
        run: pytest --cov --cov-report=xml

      - uses: codecov/codecov-action@<sha>  # v5
        if: matrix.python-version == '3.13'
        with:
          files: coverage.xml
```

### Publish (PyPI)

```yaml
name: Publish

on:
  push:
    tags: ['v*.*.*']

permissions:
  contents: read
  id-token: write    # PyPI trusted publishing

jobs:
  publish:
    runs-on: ubuntu-latest
    timeout-minutes: 10
    environment:
      name: pypi
      url: https://pypi.org/p/YOUR_PACKAGE

    steps:
      - uses: actions/checkout@<sha>  # v4

      - uses: actions/setup-python@<sha>  # v5
        with:
          python-version: '3.13'

      - run: pip install build
      - run: python -m build

      - uses: pypa/gh-action-pypi-publish@<sha>  # v1
```

---

## Docker

### Build & Push

```yaml
name: Docker

on:
  push:
    branches: [main]
    tags: ['v*.*.*']
  schedule:
    - cron: '0 4 * * 1'    # Weekly rebuild (security patches)

permissions:
  contents: read
  packages: write

concurrency:
  group: docker-${{ github.ref }}
  cancel-in-progress: true

jobs:
  build:
    runs-on: ubuntu-latest
    timeout-minutes: 30

    steps:
      - uses: actions/checkout@<sha>  # v4

      - uses: docker/setup-buildx-action@<sha>  # v3

      - uses: docker/login-action@<sha>  # v3
        with:
          registry: ghcr.io
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      - uses: docker/metadata-action@<sha>  # v5
        id: meta
        with:
          images: ghcr.io/${{ github.repository }}
          tags: |
            type=ref,event=branch
            type=semver,pattern={{version}}
            type=semver,pattern={{major}}.{{minor}}
            type=sha

      - uses: docker/build-push-action@<sha>  # v6
        with:
          context: .
          push: ${{ github.event_name != 'pull_request' }}
          tags: ${{ steps.meta.outputs.tags }}
          labels: ${{ steps.meta.outputs.labels }}
          cache-from: type=gha
          cache-to: type=gha,mode=max
          platforms: linux/amd64,linux/arm64
```

---

## Multi-Stack (PHP + Node + Flutter)

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

permissions:
  contents: read

concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true

jobs:
  backend:
    runs-on: ubuntu-latest
    timeout-minutes: 15
    defaults:
      run:
        working-directory: ./api
    services:
      postgres:
        image: postgres:17
        env:
          POSTGRES_DB: testing
          POSTGRES_USER: test
          POSTGRES_PASSWORD: test
        ports: ['5432:5432']
        options: --health-cmd="pg_isready" --health-interval=10s --health-timeout=5s --health-retries=5
    steps:
      - uses: actions/checkout@<sha>  # v4
      - uses: shivammathur/setup-php@<sha>  # v2
        with:
          php-version: '8.4'
      - run: composer install --prefer-dist --no-progress
      - run: vendor/bin/pint --test
      - run: php artisan test --parallel

  frontend:
    runs-on: ubuntu-latest
    timeout-minutes: 15
    defaults:
      run:
        working-directory: ./web
    steps:
      - uses: actions/checkout@<sha>  # v4
      - uses: actions/setup-node@<sha>  # v4
        with:
          node-version: 22
          cache: npm
          cache-dependency-path: web/package-lock.json
      - run: npm ci
      - run: npm run build
      - run: npm test

  mobile:
    runs-on: ubuntu-latest
    timeout-minutes: 20
    defaults:
      run:
        working-directory: ./app
    steps:
      - uses: actions/checkout@<sha>  # v4
      - uses: subosito/flutter-action@<sha>  # v2
        with:
          channel: stable
          cache: true
      - run: flutter pub get
      - run: dart analyze --fatal-infos
      - run: flutter test --coverage
```

---

## Dependabot Configuration

### Standard (.github/dependabot.yml)

```yaml
version: 2
updates:
  # GitHub Actions
  - package-ecosystem: github-actions
    directory: /
    schedule:
      interval: weekly
    open-pull-requests-limit: 3

  # npm
  - package-ecosystem: npm
    directory: /
    schedule:
      interval: weekly
    open-pull-requests-limit: 5
    groups:
      dev-dependencies:
        dependency-type: development
      production-dependencies:
        dependency-type: production

  # Composer
  - package-ecosystem: composer
    directory: /
    schedule:
      interval: weekly
    open-pull-requests-limit: 5

  # pub (Dart/Flutter)
  - package-ecosystem: pub
    directory: /
    schedule:
      interval: weekly
    open-pull-requests-limit: 5

  # pip
  - package-ecosystem: pip
    directory: /
    schedule:
      interval: weekly

  # Docker
  - package-ecosystem: docker
    directory: /
    schedule:
      interval: weekly

  # Go modules
  - package-ecosystem: gomod
    directory: /
    schedule:
      interval: weekly
```
