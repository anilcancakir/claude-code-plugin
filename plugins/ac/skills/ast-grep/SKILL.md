---
name: ast-grep
description: "Structural code search via ast-grep (sg) CLI. Use when text grep is insufficient — finding code patterns by AST structure, matching specific language constructs, or locating code with structural characteristics (e.g., 'async functions without error handling', 'all calls to X with 3+ args'). Prefer over Grep when the query is about code structure, not just text."
user-invocable: false
---

# ast-grep — Structural Code Search

AST-level code search via `sg` CLI (tree-sitter based). Sits between text Grep and semantic LSP — matches code by structure, not text. Use when Grep would over-match or miss structural nuance.

## When to Use ast-grep vs Grep vs LSP

| Need | Tool | Why |
|------|------|-----|
| Find text/string/identifier | Grep | Fast, simple |
| Find references/definitions | LSP | Semantic, precise |
| Find code **patterns** (structural) | ast-grep | AST-aware matching |
| Find missing patterns (NOT has X) | ast-grep | Composite rules |
| Bulk refactor pattern detection | ast-grep | Structural + metavariables |

**ast-grep signals**: "functions that contain/don't contain X", "calls with N+ arguments", "classes missing method Y", "pattern A inside context B", any query about code **structure** rather than text.

---

## CLI Quick Reference

### Pattern Search (simple, single-node)

```bash
# Find console.log calls
sg run --pattern 'console.log($ARG)' --lang javascript .

# Find await expressions
sg run --pattern 'await $EXPR' --lang typescript ./src

# JSON output for programmatic use
sg run --pattern 'function $NAME($$$)' --lang javascript --json .
```

### Rule Search (complex, structural)

```bash
# Inline rule — escape $ in shell
sg scan --inline-rules "id: find-it
language: javascript
rule:
  kind: function_declaration
  has:
    pattern: await \$EXPR
    stopBy: end" ./src

# Rule file
sg scan --rule /tmp/my-rule.yml ./src
```

### AST Inspection (debugging)

```bash
# See AST structure — find correct `kind` values
sg run --pattern 'your code here' --lang javascript --debug-query=cst

# Formats: cst (all nodes), ast (named only), pattern (how sg parses your pattern)
```

### Test Before Search

```bash
# Verify rule matches before scanning codebase
echo "async function test() { await fetch(); }" | sg scan --inline-rules "id: test
language: javascript
rule:
  pattern: await \$EXPR" --stdin
```

---

## Rule Writing

### Metavariables

| Syntax | Captures | Example |
|--------|----------|---------|
| `$VAR` | Single named node | `console.log($ARG)` |
| `$$VAR` | Single unnamed node (operator, punctuation) | `a $$OP b` |
| `$$$VAR` | Zero or more nodes | `foo($$$ARGS)` |
| `$_VAR` | Non-capturing (performance) | `$_FUNC($_ARG)` |

Reuse captures equality: `$A == $A` matches `x == x` but not `x == y`.

### Rule Types

**Atomic** — match single node:
- `pattern: console.log($ARG)` — code pattern
- `kind: function_declaration` — AST node type
- `regex: ^[a-z]+$` — text content

**Relational** — position-based (always use `stopBy: end`):
- `has:` — descendant matches sub-rule
- `inside:` — ancestor matches sub-rule
- `precedes:` / `follows:` — sibling ordering

**Composite** — logical combination:
- `all:` — AND (ordered, important for metavariables)
- `any:` — OR
- `not:` — negation

### Critical: Always Use stopBy: end

Relational rules default to `stopBy: neighbor` (stops at first non-match). For deep search:

```yaml
has:
  pattern: await $EXPR
  stopBy: end    # ← traverse entire subtree
```

---

## Common Patterns

### Find functions containing specific code

```yaml
rule:
  kind: function_declaration
  has:
    pattern: await $EXPR
    stopBy: end
```

### Find code inside specific context

```yaml
rule:
  pattern: console.log($$$)
  inside:
    kind: method_definition
    stopBy: end
```

### Find code MISSING expected pattern

```yaml
rule:
  all:
    - kind: function_declaration
    - has:
        pattern: await $EXPR
        stopBy: end
    - not:
        has:
          kind: try_statement
          stopBy: end
```

### Match multiple alternatives

```yaml
rule:
  any:
    - pattern: console.log($$$)
    - pattern: console.warn($$$)
    - pattern: console.error($$$)
```

---

## Shell Escaping

In `--inline-rules`, escape `$` for metavariables:

```bash
# Backslash escape
sg scan --inline-rules "rule: {pattern: 'console.log(\$ARG)'}" .

# Or single-quote the entire string
sg scan --inline-rules 'rule: {pattern: "console.log($ARG)"}' .
```

---

## Workflow

1. **Clarify the structural query** — what pattern, which language, include/exclude criteria
2. **Start simple** — try `sg run --pattern` first. Only escalate to `--inline-rules` if relational/composite logic needed
3. **Debug with AST** — if no matches, use `--debug-query=cst` to see actual node kinds
4. **Test on snippet** — pipe example code via `--stdin` before scanning codebase
5. **Search codebase** — once pattern confirmed, scan target directory

For detailed rule syntax (object patterns, nthChild, range, field option, strictness modes), see `references/rule_reference.md`.
