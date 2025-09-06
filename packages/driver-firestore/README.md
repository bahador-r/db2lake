<p align="center">
  <img src="../../assets/db2lake-logo240.png" width="200" alt="db2lake logo" />
</p>

# @db2lake/driver-firestore

Firestore source driver for the `@db2lake` pipeline framework. Streams documents using Firestore queries with cursor-based pagination and snapshot-based batching.

## Installation

Install the driver:

```bash
npm install @db2lake/driver-firestore
```

Credentials: provide credentials via `appOptions.credential` (e.g., `credential.cert(...)`) or use environment-based credentials where appropriate. Do not commit service account keys to source control.

## Project structure

```
├── src/
│   ├── index.ts  # FirestoreSourceDriver implementation
│   └── index.test.ts  # unit tests
│   └── type.ts   # Type definitions for configuration
└── package.json  # Package metadata
```

## Quick usage

```ts
import { FirestoreSourceDriver, FirestoreConfig } from '@db2lake/driver-firestore';
import { credential } from 'firebase-admin';

const config: FirestoreConfig = {
  appOptions: {
    credential: credential.cert(require('./service-account.json'))
  },
  collection: 'users',
  orderBy: [['lastName', 'asc']],
  limit: 50
};

const driver = new FirestoreSourceDriver(config);
try {
  for await (const batch of driver.fetch()) {
    console.log(`Processing ${batch.length} users...`);
  }
} finally {
  await driver.close();
}
```

## Advanced example (filters, multiple sort fields)

```ts
import { FirestoreSourceDriver, FirestoreConfig } from '@db2lake/driver-firestore';
import { credential } from 'firebase-admin';

const config: FirestoreConfig = {
  appOptions: { credential: credential.cert(require('./service-account.json')) },
  collection: 'orders',
  where: [
    ['status', '==', 'pending'],
    ['amount', '>', 1000]
  ],
  orderBy: [ ['createdAt', 'desc'], ['amount', 'desc'] ],
  limit: 100,
  startAfter: [new Date('2025-01-01'), 5000]
};

const driver = new FirestoreSourceDriver(config);
try {
  for await (const batch of driver.fetch()) {
    for (const doc of batch) console.log(doc.id, doc);
  }
} finally {
  await driver.close();
}
```

## Configuration reference

- `where?: [string, WhereFilterOp, any][]` — filter conditions
- `orderBy?: [string, OrderByDirection][]` — ordering (required when using cursors)
- `limit?: number` — batch size (default 100)
- `startAt? | startAfter? | endBefore? | endAt?` — cursor values matching `orderBy`
- `appOptions` — options for `initializeApp` including credentials
- `appName?` — optional Firebase app name
- `collection` — collection path to query

Notes:
- The driver calls `connect()` automatically on first `fetch()` if not connected.
- `fetch()` yields arrays of documents in the shape `{ id: string, ...data }`.

## API

- `new FirestoreSourceDriver<T>(config: FirestoreConfig)` — construct driver
- `connect(): Promise<void>` — initialize Firebase app and Firestore client
- `fetch(): AsyncGenerator<Array<{id: string} & DocumentData>, void, unknown>` — iterate batches
- `close(): Promise<void>` — terminate Firestore client and reset state

## Error handling

Driver operations may throw `FirebaseError` for invalid credentials, permission issues, or network errors. Use try/catch/finally and always call `close()` in a `finally` block to release resources.

## License

MIT
