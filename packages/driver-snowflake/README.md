<p align="center">
  <img src="https://raw.githubusercontent.com/bahador-r/db2lake/master/assets/db2lake-logo240.png" width="200" alt="db2lake logo" />
</p>

# @db2lake/driver-snowflake

This is a destination driver for Snowflake, part of the [`@db2lake`](https://www.npmjs.com/package/@db2lake) framework. The driver provides functionality to connect to and write data to Snowflake databases using the official [`snowflake-sdk`](https://www.npmjs.com/package/snowflake-sdk) package.

## Features

- Bulk data loading with configurable batch sizes
- Automatic table creation with custom schema support
- Transaction management with configurable timeouts
- Clustering and data retention configuration
- Connection management and resource cleanup
- Error handling with configurable retries
- Support for various authentication methods

## Installation

Install the package from your workspace or npm registry using the package name declared in `package.json`:

```bash
npm install @db2lake/driver-snowflake
```

## Usage

```typescript
import { SnowflakeDestinationDriver } from '@db2lake/driver-snowflake';

interface UserRecord {
  id: number;
  name: string;
  created_at: Date;
}

const config = {
  connection: {
    account: 'your_account.region.cloud',
    username: 'your_username',
    password: 'your_password',
    database: 'your_database',
    warehouse: 'your_warehouse',
    schema: 'PUBLIC',
    role: 'ACCOUNTADMIN'
  },
  table: {
    schema: 'PUBLIC',
    table: 'users',
    createIfNotExists: true,
    columns: [
      { name: 'id', type: 'NUMBER', primaryKey: true },
      { name: 'name', type: 'VARCHAR', nullable: false },
      { name: 'created_at', type: 'TIMESTAMP_NTZ' }
    ],
    clusterBy: ['created_at'],
    retentionDays: 90
  },
  batch: {
    size: 1000,
    maxRetries: 3,
    retryDelay: 1000
  },
  transaction: {
    // Note: the driver checks `transaction?.enabled`. If omitted or false, the driver
    // will perform non-transactional inserts. Enable when you want BEGIN/COMMIT semantics.
    enabled: true,
    queryTimeout: 60,
    maxParallelStatements: 4
  }
};

async function example() {
  const driver = new SnowflakeDestinationDriver<UserRecord>(config);
  
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

## Configuration

### Connection Options

| Option | Type | Required | Description |
|--------|------|----------|-------------|
| account | string | Yes | Account identifier (`<account>.<region>.<cloud>`) |
| username | string | Yes | Username for authentication |
| password | string | Yes | Password for authentication |
| database | string | Yes | Database name |
| warehouse | string | Yes | Warehouse to use |
| schema | string | No | Schema name (default: PUBLIC) |
| role | string | No | Role to use (default: ACCOUNTADMIN) |
| authenticator | string | No | Authentication type (default: SNOWFLAKE) |

### Table Options

| Option | Type | Required | Description |
|--------|------|----------|-------------|
| schema | string | No (default: PUBLIC) | Schema name |
| table | string | Yes | Table name |
| createIfNotExists | boolean | No | Create table if missing |
| columns | SnowflakeColumn[] | No* | Column definitions (*required if createIfNotExists=true) |
| clusterBy | string[] | No | Clustering keys |
| retentionDays | number | No | Data retention period |

### Column Definition

| Option | Type | Description |
|--------|------|-------------|
| name | string | Column name |
| type | string | Snowflake data type |
| nullable | boolean | Allow NULL values |
| default | string | Default value |
| unique | boolean | Unique constraint |
| primaryKey | boolean | Primary key constraint |

### Batch Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| size | number | 1000 | Rows per batch |
| maxRetries | number | 3 | Max retry attempts |
| retryDelay | number | 1000 | Delay between retries (ms) |

### Transaction Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| enabled | boolean | false | Enable transactions (driver will only BEGIN/COMMIT when true) |
| queryTimeout | number | - | Query timeout (seconds) |
| maxParallelStatements | number | 1 | Max parallel statements |

## Error Handling

The driver implements comprehensive error handling:
- Connection errors with detailed messages
- Automatic transaction rollback on errors
- Configurable retry mechanism for transient failures
- Proper resource cleanup in all scenarios

## License

This project is licensed under the MIT License - see the LICENSE file for details.
