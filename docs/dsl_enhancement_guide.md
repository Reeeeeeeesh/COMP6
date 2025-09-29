# DSL Enhancement Guide

## Conditional Syntax
- `when(condition, then, else)`
- `in_range(value, min, max)`
- `lookup(key, {mapping})`

## Composite KPIs
- Access via `metrics['kpi_name']`.

## Security
- Whitelist evaluation; no method/attribute access.

## Best Practices
- Keep expressions simple; prefer vectorizable forms.
