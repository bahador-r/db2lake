<p align="center">
  <img src="../../assets/db2lake-logo240.png" width="200" alt="db2lake logo" />
</p>

# @db2lake/driver-databricks

High-performance Databricks destination driver for `@db2lake`. It writes batches of records to a Databricks SQL table using the `@databricks/sql` SDK and supports optional table creation, transactions with retries, and configurable batching.

Note: This driver depends on the `@databricks/sql` package at runtime.

## Install

```bash
npm install @db2lake/driver-databricks
```
## Project structure

```
├── src/
│   └── index.ts  # DatabricksDestinationDriver implementation
│   └── type.ts   # DatabricksConfig and related types
└── package.json  # Package metadata
```

## Quick usage

```typescript
import { DatabricksDestinationDriver, DatabricksConfig } from '@db2lake/driver-databricks';

const config: DatabricksConfig = {
  connection: { host: 'workspace.cloud.databricks.com', path: '/sql/1.0/warehouses/xxx', token: process.env.DATABRICKS_TOKEN! },
  database: 'my_db',
  table: 'my_table',
  batchSize: 1000,
  transaction: { enabled: true, maxRetries: 3 }
};

const driver = new DatabricksDestinationDriver<{ name: string; age: number }>(config);
try {
  await driver.insert([{ name: 'John', age: 30 }]);
  // Inserts are buffered and flushed when batchSize is reached or on close()
} finally {
  await driver.close();
}
```

## Create table with schema

If you want the driver to create the target table automatically, pass `createTableOptions` in the config. The driver will generate and execute a `CREATE TABLE IF NOT EXISTS` statement using the provided `schema`, optional `properties`, and `comment`.

## Config summary

- `connection` - `{ host, path, token }` for the Databricks SQL warehouse
- `database` - target database/catalog name
- `table` - target table name
- `createTableOptions?` - `{ schema: DatabricksColumn[], properties?: Record<string,string>, comment?: string }`
- `writeMode?` - `'append' | 'overwrite'` (default: `append`)
- `batchSize?` - flush threshold (default: 1000)
- `transaction?` - `{ enabled?: boolean, maxRetries?: number }` (default enabled=true, maxRetries=3)


## Best practices

- Always call `close()` to flush pending rows and release connections.
- Tune `batchSize` to balance performance and memory use.
- Use `createTableOptions` to automate schema management in CI or initial runs.

## License

MIT
