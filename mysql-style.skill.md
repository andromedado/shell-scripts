---
name: mysql-style
description: Style guide for writing MySQL queries and expressions. Use when writing, reviewing, or refining any SQL for MySQL.
---

## Query Style Rules

- Always use fully qualified table names (e.g. `schema_name.table_name`)
- Always alias every table, even when working with a single table (e.g. `FROM schema_name.table_name AS ta`)
- Never reference columns that don't exist: only reference columns you know exist.
- For non-temporary tables, the presumption is that adding indexes would require a release cycle
- Ignore cosmetic choices like `WHERE 1\nAND`
- For first-pass review/suggestions, do not suggest adding indexes to non-temporary tables. If the context is not ad-hoc, ask at the end if the user wants to consider adding indexes

## Delivering Results

If iterating on multiple queries, as final output include the full updated queries.
When you have arrived at a final query or expression, include it in the chat output as a fenced SQL code block.
And then also past the final query into a timestamped file in `/privat/tmp/`
Then drop a 'link' in the output: e.g. `file:///private/tmp/1780330805.sql`

## Joining Tables

Before writing a JOIN, check the available indexes on the relevant tables (via `mysql-schema skill show_create_table`).

If the available indexes would not support a performant join (e.g. the join column is not indexed on the larger table), use temporary tables instead of a direct JOIN.

Our current version of MySQL doesn't support reopening temporary tables; account for that in the sql you write.

## Temporary Tables

When creating temporary tables:

- Use the `dev_temp` schema: `CREATE TEMPORARY TABLE dev_temp.my_temp_table AS ...`
- Always immediately precede every `CREATE TEMPORARY TABLE` with a matching `DROP TEMPORARY TABLE IF EXISTS` for the same table name
- Prefer explicit table definition vs "CREATE ... AS". Prefer column definitions that match underlying data types.
- When the purpose of a temporary table's column is optimizing for a join, ensure that 1: the column is indexed, and 2: the character encoding matches the joined column's encoding.

Example pattern:
```sql
DROP TEMPORARY TABLE IF EXISTS dev_temp.my_temp;
CREATE TEMPORARY TABLE dev_temp.my_temp (
  id INT,
  col VARCHAR(64),
  PRIMARY KEY (id)
);
INSERT IGNORE INTO dev_temp.my_temp
SELECT t.id, t.col
FROM schema_name.table_name AS t
WHERE t.status = 'active';
```
