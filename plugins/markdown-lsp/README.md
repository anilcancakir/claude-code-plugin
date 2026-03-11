# markdown-lsp

**Markdown language server for Claude Code.**

Provides code intelligence for Markdown files — link navigation, find references, and document symbols via marksman.

## Install

```bash
# Requires ac marketplace
/plugin install markdown-lsp@ac
```

## What It Provides

LSP integration for `.md` and `.mdx` files via `marksman`:

- **Go-to-definition**: Jump to link targets and heading anchors
- **Find references**: Locate all links pointing to a heading or file
- **Document symbols**: Navigate headings as a document outline
- **Hover**: Preview link targets inline

## Prerequisites

Install marksman:

```bash
brew install marksman
```

## Verification

```bash
marksman --version
```

## License

MIT
