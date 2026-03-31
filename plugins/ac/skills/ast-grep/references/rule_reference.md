# ast-grep Rule Reference

Comprehensive rule syntax for `sg` CLI. Load on demand — not needed for simple pattern searches.

## Rule Object

YAML format. Every field optional, but at least one positive key required. Multiple fields = implicit AND.

| Property | Type | Category | Purpose |
|----------|------|----------|---------|
| `pattern` | String/Object | Atomic | Match by code pattern |
| `kind` | String | Atomic | Match by AST node type |
| `regex` | String | Atomic | Match node text by regex |
| `nthChild` | Number/String/Object | Atomic | Match by position in parent |
| `inside` | Object | Relational | Target inside ancestor matching sub-rule |
| `has` | Object | Relational | Target has descendant matching sub-rule |
| `precedes` | Object | Relational | Target before sibling matching sub-rule |
| `follows` | Object | Relational | Target after sibling matching sub-rule |
| `all` | Array | Composite | AND — all sub-rules match (ordered) |
| `any` | Array | Composite | OR — any sub-rule matches |
| `not` | Object | Composite | NOT — sub-rule does not match |
| `matches` | String | Composite | Reference utility rule by ID |

## Pattern (Atomic)

### String Form

```yaml
pattern: console.log($ARG)
```

### Object Form

- `selector`: pinpoint specific node in parsed pattern
- `context`: surrounding code for correct parsing
- `strictness`: matching algorithm (`cst`, `smart`, `ast`, `relaxed`, `signature`)

```yaml
pattern:
  selector: field_definition
  context: class { $F }
```

## Kind (Atomic)

Match by tree-sitter node kind name. Use `--debug-query=cst` to find correct kind values.

```yaml
kind: call_expression
```

## Relational Rules

### stopBy (critical)

| Value | Behavior |
|-------|----------|
| `"neighbor"` (default) | Stop at first non-match |
| `"end"` | Search to root (inside) or leaf (has) |
| Rule object | Stop when surrounding node matches rule |

**Best practice**: Always use `stopBy: end` unless you have a specific reason not to.

### field

Specify sub-node within target for `inside`/`has`:

```yaml
has:
  field: operator
  pattern: $$OP
```

### inside

```yaml
inside:
  pattern: class $C { $$$ }
  stopBy: end
```

### has

```yaml
has:
  pattern: await $EXPR
  stopBy: end
```

### precedes / follows

```yaml
precedes:
  pattern: return $VAL
```

## Composite Rules

### all (AND, ordered)

Order matters for metavariable dependencies:

```yaml
all:
  - kind: call_expression
  - pattern: console.log($ARG)
```

### any (OR)

```yaml
any:
  - pattern: foo()
  - pattern: bar()
```

### not (negation)

```yaml
not:
  pattern: console.log($ARG)
```

### matches (rule reuse)

Reference predefined utility rule by ID. Enables recursive rules.

```yaml
matches: my-utility-rule-id
```

## Metavariables

| Syntax | Captures | Notes |
|--------|----------|-------|
| `$VAR` | Single named node | `$META`, `$META_VAR`, `$_` valid |
| `$$VAR` | Single unnamed node | Operators, punctuation |
| `$$$VAR` | Zero or more nodes | Non-greedy |
| `$_VAR` | Non-capturing | Can match different content even if same name |

**Constraints**: metavariable text must be the only content in its AST node. These do NOT work: `obj.on$EVENT`, `"Hello $WORLD"`, `a $OP b`.

**Reuse**: Same metavariable in one pattern enforces equality — `$A == $A` matches `x == x` only.

## nthChild (Atomic)

1-based index within parent's named children:

- Number: `nthChild: 1` (first child)
- An+B formula: `nthChild: "2n+1"` (odd positions)
- Object: `{ position: 1, reverse: true, ofRule: { kind: argument } }`

## Troubleshooting

1. **No matches**: use `--debug-query=cst` to see actual AST
2. **Relational rule fails**: add `stopBy: end`
3. **Wrong kind**: check language's tree-sitter grammar
4. **Metavariable not captured**: ensure it's the only content in its AST node
5. **Complex pattern fails**: break into sub-rules with `all`
