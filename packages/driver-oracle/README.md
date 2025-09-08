<p align="center">
  <img src="https://raw.githubusercontent.com/bahador-r/db2lake/master/assets/db2lake-logo240.png" width="200" alt="db2lake logo" />
</p>

# @db2lake/driver-oracle

Oracle source driver for the `@db2lake` pipeline framework. It streams rows from Oracle using `oracledb` pools and supports simple cursor-based pagination.

## Key points
- Uses `oracledb`'s `createPool` and `pool.getConnection()` to manage connections.
- Streams data in batches through an async generator: `fetch()` yields arrays of row objects.
- Cursor-based pagination is supported by updating a parameter in `params` between pages.

## Install

Install the published package:

```bash
npm install @db2lake/driver-oracle
```

## Project structure

```
├── src/
│   └── index.ts  # OracleSourceDriver implementation
│   └── type.ts   # Oracle configuration types
└── package.json  # Package metadata
```

Note: `oracledb` may require native dependencies and a supported Oracle client on the host machine. See the `oracledb` documentation for installation details.

## Usage

```typescript
import { OracleSourceDriver, OracleConfig } from '@db2lake/driver-oracle';

const config: OracleConfig = {
  // Use bind placeholders (e.g. :id) in your SQL
  query: 'SELECT * FROM users WHERE id > :id ORDER BY id FETCH NEXT 100 ROWS ONLY',
  params: [0],               // initial params
  cursorField: 'id',         // field from last row used as next cursor
  cursorParamsIndex: 0,      // index in params to replace with cursor value
  poolAttributes: { user: 'app', password: 'secret', connectString: 'localhost/XEPDB1' }
};

const driver = new OracleSourceDriver(config);
for await (const batch of driver.fetch()) {
  for (const row of batch) {
    // process row
  }
}
await driver.close();
```

## Configuration

- `query` (string) - SQL query with placeholders (Oracle bind syntax like `:id`).
- `params` (any[]) - Parameter array passed to `connection.execute(query, params)`; the driver clones this array for paging and updates `params[cursorParamsIndex]` when `cursorField` is configured.
- `cursorField` (string | undefined) - When provided, pagination continues by reading this field from the last row of each batch and placing it into `params[cursorParamsIndex]` for the next query.
- `cursorParamsIndex` (number | undefined) - Which index in `params` to replace with the cursor value.
- `poolAttributes` (object | undefined) - Options forwarded to `oracledb.createPool` (for example `{ user, password, connectString }`).

## License

MIT
