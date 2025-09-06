

<p align="center">
  <img src="./assets/db2lake-logo240.png" width="200" alt="db2lake logo" />
</p>

# @db2lake/core

Introduction
------------

db2lake is a small framework for extracting data from databases and loading it into
data lakes and warehouses. It provides a tiny, stable core API and a set of
driver packages (sources and destinations). Drivers can be scheduled and resumed
using cursor information so that only new data is transferred on subsequent runs.

This repository is a monorepo that includes the `core` package plus multiple
source and destination drivers.

Install
-------

Install the core package:

```bash
npm install @db2lake/core
```

Source drivers
--------------

| Purpose | Driver | Install | 
|---|:---|---|
| MySQL | [`@db2lake/driver-mysql`](https://github.com/bahador-r/@db2lake/driver-mysql) | `npm i @db2lake/driver-mysql` | 
| Firestore | [`@db2lake/driver-firestore`](https://github.com/bahador-r/@db2lake/driver-firestore) | `npm i @db2lake/driver-firestore` |
| Postgres | [`@db2lake/driver-postgres`](https://github.com/bahador-r/@db2lake/driver-postgres) | `npm i @db2lake/driver-postgres` | 
| Oracle | [`@db2lake/driver-oracle`](https://github.com/bahador-r/@db2lake/driver-oracle) | `npm i @db2lake/driver-oracle` | 

Destination drivers
-------------------

| Purpose | Driver | Install | 
|---|:---|---|
| BigQuery | [`@db2lake/driver-bigquery`](https://github.com/bahador-r/@db2lake/driver-bigquery) | `npm i @db2lake/driver-bigquery` | 
| Databricks | [`@db2lake/driver-databricks`](https://github.com/bahador-r/@db2lake/driver-databricks) | `npm i @db2lake/driver-databricks` |
| Redshift | [`@db2lake/driver-redshift`](https://github.com/bahador-r/@db2lake/driver-redshift) | `npm i @db2lake/driver-redshift` | 
| Snowflake | [`@db2lake/driver-snowflake`](https://github.com/bahador-r/@db2lake/driver-snowflake) | `npm i @db2lake/driver-snowflake` | 

Quick install example
---------------------

Install the core plus the MySQL source and BigQuery destination (example):

```bash
npm install @db2lake/core @db2lake/driver-mysql @db2lake/driver-bigquery
```

Complete TypeScript example
---------------------------

The following example demonstrates a simple pipeline using the MySQL source
driver and the BigQuery destination driver. It uses a transformer to adapt the
source rows and a lightweight logger passed into the pipeline.

Save as `examples/mysql-to-bigquery.ts` and run with `ts-node` or compile with
`tsc`.

```typescript
import { Pipeline, ITransformer, ILogger } from '@db2lake/core';
import { MySQLSourceDriver } from '@db2lake/driver-mysql';
import { BigQueryDestinationDriver } from '@db2lake/driver-bigquery';

// --- Configure drivers (fill with your credentials) ---
const mysqlConfig = {
    query: 'SELECT * FROM orders WHERE order_id > ? LIMIT 50',
    params: [0],
    cursorField: 'order_id',
    cursorParamsIndex: 0,
    connectionUri: 'mysql://user:password@localhost:3306/shopdb'
};

const bigqueryConfig = {
    bigQueryOptions: {
        keyFilename: './service-account.json',
        projectId: 'my-project-id'
    },
    dataset: 'my_dataset',
    table: 'users',
    batchSize: 1000,
    // Optional: use streaming for real-time inserts
    writeOptions: {
        sourceFormat: 'NEWLINE_DELIMITED_JSON'
    }
};

// --- Transformer: adapt source row shape to destination schema ---
const transformer: ITransformer<any, any> = (rows) => rows.map(r => ({
    id: r.id,
    fullName: `${r.name}`,
    createdAt: r.created_at instanceof Date ? r.created_at.toISOString() : r.created_at
}));

// --- Logger ---
const logger: ILogger = (level, message, data) => {
    const ts = new Date().toISOString();
    console.log(`${ts} [${level.toUpperCase()}] ${message}`);
    if (data) console.debug(data);
};

async function main() {
    const source = new MySQLSourceDriver(mysqlConfig as any);
    const dest = new BigQueryDestinationDriver(bigqueryConfig as any);

    const pipeline = new Pipeline(source as any, dest as any, transformer, logger);

    try {
        await pipeline.run();
        console.log('Pipeline finished', pipeline.getMetrics());
    } catch (err) {
        console.error('Pipeline error', err);
    }
}

main().catch(err => { console.error(err); process.exit(1); });
```


Contributing
------------

PRs that add drivers or improve the core API are welcome. Try to keep the core
API minimal and well-documented so drivers remain simple to implement.

License
-------

MIT
