<p align="center">
  <img src="https://raw.githubusercontent.com/bahador-r/db2lake/master/assets/db2lake-logo240.png" width="200" alt="db2lake logo" />
</p>

# @db2lake/driver-mysql

MySQL source driver for the `@db2lake` pipeline. Streams rows using cursor-based pagination and the `mysql2/promise` client.

## Features
- Cursor-based pagination (generator/streaming)
- Parameterized queries
- TypeScript types and minimal surface area for integration with `@db2lake` pipelines

## Installation

Install the package:

```bash
npm install @db2lake/driver-mysql
```

## Project structure

```
├── src/
│   └── index.ts  # MySQLSourceDriver implementation
│   └── type.ts   # MySQL configuration types
└── package.json  # Package metadata
```

## Quick usage

```ts
import { MySQLSourceDriver, MySQLConfig } from '@db2lake/driver-mysql';

const config: MySQLConfig = {
  query: 'SELECT * FROM users WHERE id > ? LIMIT 100',
  params: [0],
  cursorField: 'id',
  cursorParamsIndex: 0,
  connectionOptions: { host: 'localhost', user: 'root', database: 'test' }
};

const driver = new MySQLSourceDriver(config);
for await (const batch of driver.fetch()) {
  // process batch
}
await driver.close();
```

### Using a connection URI

```ts
import { MySQLSourceDriver, MySQLConfig } from '@db2lake/driver-mysql';

const config: MySQLConfig = {
  query: 'SELECT * FROM orders WHERE order_id > ? LIMIT 50',
  params: [0],
  cursorField: 'order_id',
  cursorParamsIndex: 0,
  connectionUri: 'mysql://user:password@localhost:3306/shopdb'
};

const driver = new MySQLSourceDriver(config);
for await (const batch of driver.fetch()) {
  // process orders
}
await driver.close();
```

## Configuration Options

- `query` (string): SQL with placeholders
- `params` (any[]): parameters for the query
- `cursorField` (string | optional): field used to advance the cursor
- `cursorParamsIndex` (number | optional): index in `params` where cursor value is placed
- `connectionOptions` (ConnectionOptions | optional): passed to `mysql2/promise.createConnection`
- `connectionUri` (string | optional): connection URI to use instead of options

Notes:
- The driver will call `connect()` automatically on first `fetch()` if not connected.
- Always call `close()` to release the connection and resources.

## API

- `new MySQLSourceDriver(config: MySQLConfig)`
- `fetch(): AsyncGenerator<any[], void, unknown>` - yields batches of rows
- `connect(): Promise<void>` - establishes connection (optional)
- `close(): Promise<void>` - closes connection and cleans up

## License

MIT
