# github-actions

**GitHub Actions workflow generator for Claude Code.**

Generate production-ready GitHub Actions workflow YAML files for any language and framework — secure by default, project-aware.

## Install

```bash
# Requires ac marketplace
/plugin install github-actions@ac
```

## What It Provides

A single skill (`github-actions`) that loads when you work with CI/CD workflows. Covers:

- **CI/CD pipelines** — test, lint, build, deploy workflows
- **Release automation** — tag-based releases, npm/PyPI/pub.dev publishing
- **Docker builds** — multi-platform images, GHCR push, layer caching
- **Reusable workflows** — shared workflow definitions with inputs/secrets
- **Composite actions** — custom actions with multiple steps
- **Dependabot** — dependency update configuration
- **Security hardening** — SHA-pinned actions, minimal permissions, OIDC, injection prevention
- **Multi-language** — PHP/Laravel, Dart/Flutter, Node.js/Bun, Go, Python, Docker

## Compatibility

Works alongside:
- **git-master** — Commits workflow files following detected commit style
- **github-cli** — Debugs workflows with `gh run view`, manages secrets with `gh secret set`

## License

MIT
