/**
 * Interface definition for Databricks destination driver.
 *
 * This module extends the generic IDestinationDriver interface with Databricks-specific
 * configuration and typing. It provides the contract for implementing Databricks destination
 * drivers that support:
 * - Batch data insertion
 * - Table creation and management
 * - Transaction control
 * - Type-safe row handling
 *
 * Usage example:
 * ```typescript
 * interface UserRecord {
 *   name: string;
 *   age: number;
 *   active: boolean;
 * }
 * 
 * class DatabricksDestinationDriver implements IDatabricksDriver<UserRecord> {
 *   async insert(rows: UserRecord[]): Promise<void> {
 *     // Type-safe implementation...
 *   }
 * }
 * ```
 */
import { IDestinationDriver } from "@db2lake/core";

/**
 * Databricks driver interface for batch data insertion operations.
 *
 * @template T - Type of data being written to Databricks
 * @extends IDestinationDriver<T, DatabricksConfig>
 */
export interface IDatabricksDriver<T = any> extends IDestinationDriver<T, DatabricksConfig> {}

/**
 * Type definitions for Databricks destination driver configuration.
 *
 * This module provides interfaces for configuring Databricks data destination connections,
 * including support for SQL warehouse connections, table operations, and batch configurations.
 *
 * Usage example:
 * ```typescript
 * const config: DatabricksConfig = {
 *   connection: {
 *     token: process.env.DATABRICKS_TOKEN,
 *     host: 'my-workspace.cloud.databricks.com',
 *     path: '/sql/1.0/warehouses/xxxxx',
 *   },
 *   database: 'my_database',
 *   table: 'my_table',
 *   createTableOptions: {
 *     schema: [
 *       { name: 'name', type: 'VARCHAR' },
 *       { name: 'age', type: 'INT' }
 *     ]
 *   }
 * };
 * ```
 */

/**
 * Databricks SQL column definition.
 */
export interface DatabricksColumn {
    /**
     * Name of the column.
     */
    name: string;

    /**
     * SQL data type of the column.
     * Supports standard SQL types: VARCHAR, INT, BIGINT, DOUBLE, etc.
     */
    type: string;

    /**
     * Optional column comment.
     */
    comment?: string;
}

/**
 * Base configuration for Databricks destination options.
 */
export interface BaseDataDestinationConfig {
    /**
     * The database/catalog name where the table exists or will be created.
     * @example "my_database"
     */
    database: string;

    /**
     * The table name where data will be written.
     * @example "my_table"
     */
    table: string;

    /**
     * Options for creating the table if it doesn't exist.
     * If not provided, the table must already exist.
     */
    createTableOptions?: {
        /**
         * The schema definition for the table.
         */
        schema: DatabricksColumn[];

        /**
         * Optional table properties.
         * @example { "delta.autoOptimize.optimizeWrite": "true" }
         */
        properties?: Record<string, string>;

        /**
         * Optional table comment.
         */
        comment?: string;
    };

    /**
     * Whether to append to or overwrite the table.
     * @default "append"
     */
    writeMode?: 'append' | 'overwrite';

    /**
     * Maximum batch size for insert operations.
     * @default 1000
     */
    batchSize?: number;

    /**
     * Optional transaction settings.
     */
    transaction?: {
        /**
         * Enable or disable transaction mode.
         * @default true
         */
        enabled?: boolean;

        /**
         * Maximum number of retries for failed transactions.
         * @default 3
         */
        maxRetries?: number;
    };
}

/**
 * Databricks connection configuration.
 */
export interface DatabricksConnection {
    /**
     * Databricks workspace hostname.
     * @example "my-workspace.cloud.databricks.com"
     */
    host: string;

    /**
     * Path to the SQL warehouse.
     * @example "/sql/1.0/warehouses/xxxxx"
     */
    path: string;

    /**
     * Personal access token for authentication.
     */
    token: string;

    /**
     * Optional connection timeout in milliseconds.
     * @default 60000
     */
    timeout?: number;
}

/**
 * Databricks driver configuration.
 * Extends BaseDataDestinationConfig.
 */
export interface DatabricksConfig extends BaseDataDestinationConfig {
    /**
     * Connection configuration for Databricks SQL warehouse.
     */
    connection: DatabricksConnection;
}
