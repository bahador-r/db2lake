/**
 * Interface definition for Snowflake destination driver.
 *
 * This module extends the generic IDestinationDriver interface with Snowflake-specific
 * configuration and typing. It provides the contract for implementing Snowflake destination
 * drivers that support:
 * - Bulk data loading
 * - Table creation and schema management
 * - Transaction support
 * - Error handling and retries
 *
 * Usage example:
 * ```typescript
 * interface UserRecord {
 *   id: number;
 *   name: string;
 *   created_at: Date;
 * }
 * 
 * class SnowflakeDestinationDriver implements ISnowflakeDriver<UserRecord> {
 *   async insert(rows: UserRecord[]): Promise<void> {
 *     // Type-safe implementation...
 *   }
 * }
 * ```
 */
import { IDestinationDriver } from "@db2lake/core";

/**
 * Snowflake driver interface for batch data insertion operations.
 *
 * @template T - Type of data being written to Snowflake
 * @extends IDestinationDriver<T, SnowflakeConfig>
 */
export interface ISnowflakeDriver<T = any> extends IDestinationDriver<T, SnowflakeConfig> {}

/**
 * Type definitions for Snowflake destination driver.
 *
 * This module defines the configuration types and interfaces used by the Snowflake
 * destination driver for connecting to and writing data to Snowflake databases.
 */

/**
 * Snowflake connection configuration
 */
export interface SnowflakeConnectionConfig {
  /**
   * Account identifier (<account>.<region>.<cloud>)
   */
  account: string;

  /**
   * Username for authentication
   */
  username: string;

  /**
   * Password for authentication
   */
  password: string;

  /**
   * Database name to connect to
   */
  database: string;

  /**
   * Warehouse to use for processing
   */
  warehouse: string;

  /**
   * Schema name (default: PUBLIC)
   */
  schema?: string;

  /**
   * Role to use for operations (default: ACCOUNTADMIN)
   */
  role?: string;

  /**
   * Authentication type (default: SNOWFLAKE)
   */
  authenticator?: 'SNOWFLAKE' | 'OAUTH' | 'EXTERNALBROWSER' | 'OKTA';
}

/**
 * Snowflake table configuration
 */
export interface SnowflakeTableConfig {
  /**
   * Target table name for data insertion
   */
  table: string;

  /**
   * Schema name containing the table
   */
  schema?: string;

  /**
   * Create table if it doesn't exist
   */
  createIfNotExists?: boolean;

  /**
   * Column definitions for table creation
   */
  columns?: SnowflakeColumn[];

  /**
   * Cluster keys for table creation
   */
  clusterBy?: string[];

  /**
   * Data retention period in days
   */
  retentionDays?: number;
}

/**
 * Snowflake column definition
 */
export interface SnowflakeColumn {
  /**
   * Column name
   */
  name: string;

  /**
   * Snowflake data type
   * @example "VARCHAR", "NUMBER(38,0)", "TIMESTAMP_NTZ"
   */
  type: string;

  /**
   * Whether the column can contain NULL values
   */
  nullable?: boolean;

  /**
   * Default value for the column
   */
  default?: string;

  /**
   * Whether the column is unique
   */
  unique?: boolean;

  /**
   * Primary key constraint
   */
  primaryKey?: boolean;
}

/**
 * Batch processing configuration
 */
export interface SnowflakeBatchConfig {
  /**
   * Number of rows to process in each batch
   */
  size: number;

  /**
   * Maximum retries for failed operations
   */
  maxRetries?: number;

  /**
   * Delay between retries in milliseconds
   */
  retryDelay?: number;
}

/**
 * Transaction management configuration
 */
export interface SnowflakeTransactionConfig {
  /**
   * Whether to use transactions
   */
  enabled: boolean;

  /**
   * Query timeout in seconds
   */
  queryTimeout?: number;

  /**
   * Maximum number of parallel statements
   */
  maxParallelStatements?: number;
}

/**
 * Complete configuration for Snowflake destination driver
 */
export interface SnowflakeConfig {
  /**
   * Connection configuration
   */
  connection: SnowflakeConnectionConfig;

  /**
   * Table configuration
   */
  table: SnowflakeTableConfig;

  /**
   * Batch processing configuration
   */
  batch?: SnowflakeBatchConfig;

  /**
   * Transaction configuration
   */
  transaction?: SnowflakeTransactionConfig;
}
