<p align="center">
  <img src="../../assets/db2lake-logo240.png" width="200" alt="db2lake logo" />
</p>

# @db2lake/driver-redshift

Redshift destination driver for `@db2lake`. It writes batches of rows into an Amazon Redshift table using the `pg` client and supports optional table creation, transactions with retries, truncation, and configurable batching.

## Key points

- Uses `pg`'s `Pool` to manage connections.
- Supports automatic table creation when `createTableOptions` is provided.
- Writes in configurable batches and supports transactions with retry/rollback.
- Call `connect()` before `insert()` (or `insert()` will throw if not connected), and always call `close()` to release resources.

## Install

```bash
npm install @db2lake/driver-redshift
```

## Usage

```typescript
import { RedshiftDestinationDriver, RedshiftConfig } from '@db2lake/driver-redshift';

interface UserRecord {
  id: number;
  name: string;
  created_at: Date;
}

const config: RedshiftConfig = {
  connection: {
    host: 'my-cluster.xxxxx.region.redshift.amazonaws.com',
    port: 5439,
    database: 'dev',
    user: 'awsuser',
    password: 'mypassword',
    ssl: true
  },
  schema: 'public',
  table: 'users',
  createTableOptions: {
    columns: [
      { name: 'id', type: 'INTEGER' },
      { name: 'name', type: 'VARCHAR(255)', nullable: false },
      { name: 'created_at', type: 'TIMESTAMP' }
    ],
    distKey: 'id',
    sortKey: ['created_at']
  },
  batchSize: 1000,
  transaction: {
    enabled: true,
    maxRetries: 3
  }
};

async function example() {
  const driver = new RedshiftDestinationDriver<UserRecord>(config);
  try {
    await driver.connect();

    const records: UserRecord[] = [
      { id: 1, name: 'John Doe', created_at: new Date() },
      { id: 2, name: 'Jane Smith', created_at: new Date() }
    ];

    await driver.insert(records);
  } finally {
    await driver.close();
  }
}
```

## Configuration summary

- `connection` - `pg.ClientConfig` plus optional `ssl` settings (host, port, database, user, password)
- `schema` - target schema (default: `public`)
- `table` - target table name
- `createTableOptions?` - `{ columns: RedshiftColumn[], distKey?: string, sortKey?: string[], diststyle?: 'AUTO'|'EVEN'|'ALL'|'KEY' }`
- `truncate?` - boolean, truncate table before inserting
- `batchSize?` - number of rows per batch (default: 1000)
- `transaction?` - `{ enabled?: boolean, maxRetries?: number }` (default enabled=true, maxRetries=3)

## License

MIT
