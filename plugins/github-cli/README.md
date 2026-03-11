# github-cli

**GitHub CLI skill for Claude Code.**

Teaches Claude Code effective `gh` usage patterns for issues, PRs, releases, GitHub Actions, and repository management.

## Install

```bash
# Requires ac marketplace
/plugin install github-cli@ac
```

## What It Provides

A single skill (`github-cli`) that loads when you work with GitHub resources. Covers:

- Issue workflows (create, search, filter, label, assign)
- PR workflows (create, review, merge, checkout)
- Release workflows (create, upload assets, notes)
- GitHub Actions (run, watch, list, download artifacts)
- Advanced patterns (`gh api`, jq filtering, scripting)

## Requirements

- [GitHub CLI](https://cli.github.com/) installed and authenticated (`gh auth login`)

## License

MIT
