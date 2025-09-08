<p align="center">
  <img src="https://raw.githubusercontent.com/bahador-r/db2lake/master/assets/db2lake-logo240.png" width="200" alt="db2lake logo" />
</p>

# @db2lake/driver-postgres

Postgres source driver for the `@db2lake` pipeline framework. It streams rows from PostgreSQL using cursor-based pagination and the `pg` Pool.

Key points:
- Uses `pg`'s `Pool` for connections.
- Streams data in batches via an async generator (`fetch()`).
- Cursor-based pagination is supported by updating one of the query parameters between pages.


## Install

Install the published package:

```bash
npm install @db2lake/driver-postgres
```

## Project structure

```
├── src/
│   ├── index.ts  # FirestoreSourceDriver implementation
│   └── index.test.ts  # unit tests
│   └── type.ts   # Type definitions for configuration
└── package.json  # Package metadata
```


## Basic usage

```typescript
import { PostgresSourceDriver, PostgresConfig } from '@db2lake/driver-postgres';

const config: PostgresConfig = {
  // Query should include a placeholder for the cursor param if using cursor-based pagination
  query: 'SELECT * FROM users WHERE id > $1 ORDER BY id LIMIT 100',
  params: [0],               // initial params
  cursorField: 'id',         // field name used to set the next cursor value
  cursorParamsIndex: 0,      // index inside `params` that will be replaced with the cursor value
  // poolConfig is forwarded to `new Pool(poolConfig)` from the `pg` package
  poolConfig: { connectionString: 'postgres://user:pass@localhost:5432/db' }
};

const driver = new PostgresSourceDriver(config);

// consume rows in batches
for await (const batch of driver.fetch()) {
  for (const row of batch) {
    // process row
  }
}

await driver.close();
```

## Configuration

- `query` (string) - SQL query with parameter placeholders (`$1`, `$2`, ...).
- `params` (any[]) - Parameter array passed to `client.query(query, params)`; the driver will overwrite `params[cursorParamsIndex]` with the cursor value between pages when `cursorField` is set.
- `cursorField` (string | undefined) - If provided, pagination continues by reading this field from the last row of each batch and placing it into `params[cursorParamsIndex]` for the next query.
- `cursorParamsIndex` (number | undefined) - Which index in `params` to replace with the cursor value.
- `poolConfig` (object | undefined) - Options forwarded to `pg.Pool` (for example, `{ connectionString }` or `{ host, user, password, database }`).

## License

MIT
