# dart-lsp

**Dart/Flutter language server for Claude Code.**

Provides code intelligence for Dart and Flutter projects — go-to-definition, find references, hover information, and real-time diagnostics.

## Install

```bash
# Requires ac marketplace
/plugin install dart-lsp@ac
```

## What It Provides

LSP integration for `.dart` files via the Dart analysis server:

- **Go-to-definition**: Jump to where a symbol is declared
- **Find references**: Locate all usages of a symbol across the project
- **Hover information**: View type signatures and documentation inline
- **Real-time diagnostics**: Errors and warnings injected after every edit via `<new-diagnostics>`
- **Document symbols**: List all classes, methods, and fields in a file

## Prerequisites

The Dart language server ships with the Dart SDK. Install either:

**Dart SDK**

```bash
# macOS (Homebrew)
brew tap dart-lang/dart && brew install dart

# Or via Flutter SDK (includes Dart):
brew install flutter
```

**Flutter SDK**

```bash
brew install flutter
# Or download from https://flutter.dev/docs/get-started/install
```

## Verification

Confirm the language server binary is available:

```bash
dart language-server --help
```

## License

MIT
