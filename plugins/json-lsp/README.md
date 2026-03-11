# json-lsp

**JSON language server for Claude Code.**

Provides code intelligence for JSON and JSONC files — schema validation, hover information, diagnostics, and completions.

## Install

```bash
# Requires ac marketplace
/plugin install json-lsp@ac
```

## What It Provides

LSP integration for `.json` and `.jsonc` files via `vscode-json-languageserver`:

- **Schema validation**: Real-time validation against JSON Schema
- **Hover information**: View schema descriptions and type info inline
- **Diagnostics**: Syntax errors and schema violations injected via `<new-diagnostics>`
- **Completions**: Schema-aware property and value suggestions

## Prerequisites

Install the language server via npm:

```bash
npm install -g vscode-langservers-extracted
```

## Verification

```bash
vscode-json-languageserver --version
```

## License

MIT
