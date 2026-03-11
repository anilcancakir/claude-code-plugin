# yaml-lsp

**YAML language server for Claude Code.**

Provides code intelligence for YAML and YML files — schema validation, hover information, and real-time diagnostics.

## Install

```bash
# Requires ac marketplace
/plugin install yaml-lsp@ac
```

## What It Provides

LSP integration for `.yaml` and `.yml` files via `yaml-language-server`:

- **Schema validation**: Validate against JSON Schema (Kubernetes, Docker Compose, GitHub Actions, etc.)
- **Hover information**: View schema descriptions and type info inline
- **Diagnostics**: Syntax errors and schema violations injected via `<new-diagnostics>`
- **Completions**: Schema-aware key and value suggestions

## Prerequisites

Install the language server via npm:

```bash
npm install -g yaml-language-server
```

## Verification

```bash
yaml-language-server --version
```

## License

MIT
