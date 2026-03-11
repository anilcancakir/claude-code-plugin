# git-master

**Git expert skill for Claude Code.**

Teaches Claude Code atomic commit creation, interactive rebase, and git history archaeology — blame, bisect, pickaxe search.

## Install

```bash
# Requires ac marketplace
/plugin install git-master@ac
```

## What It Provides

A single skill (`git-master`) that loads when you work with git operations. Three modes:

- **Commit Architect**: Atomic commits with style detection, dependency ordering, mandatory split enforcement
- **Rebase Surgeon**: Interactive rebase, squash, autosquash, conflict resolution
- **History Archaeologist**: Pickaxe search, regex search, blame, bisect, file history tracking

## Key Features

- Auto-detects commit style (semantic/plain/short/sentence) from repository history
- Enforces atomic commits — never one giant commit from many files
- Mandatory justification for grouping 3+ files in a single commit
- Branch safety — never rewrites main/master, always `--force-with-lease`
- Mode auto-detection from natural language requests

## Requirements

- Git installed and configured

## License

MIT
