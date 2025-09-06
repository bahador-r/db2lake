/**
 * Interface definition for Amazon Redshift destination driver.
 *
 * This module extends the generic IDestinationDriver interface with Redshift-specific
 * configuration and typing. It provides the contract for implementing Redshift destination
 * drivers that support:
 * - Batch data insertion
 * - Table creation with distribution and sort keys
 * - Transaction management
 * - Type-safe row handling
 *
 * Usage example:
 * ```typescript
 * interface UserRecord {
 *   id: number;
 *   name: string;
 *   created_at: Date;
 * }
 * 
 * class RedshiftDestinationDriver implements IRedshiftDriver<UserRecord> {
 *   async insert(rows: UserRecord[]): Promise<void> {
 *     // Type-safe implementation...
 *   }
 * }
 * ```
 */
import { IDestinationDriver } from "@db2lake/core";

/**
 * Redshift driver interface for batch data insertion operations.
 *
 * @template T - Type of data being written to Redshift
 * @extends IDestinationDriver<T, RedshiftConfig>
 */
export interface IRedshiftDriver<T = any> extends IDestinationDriver<T, RedshiftConfig> {}

/**
 * Type definitions for Amazon Redshift destination driver configuration.
 *
 * This module provides interfaces for configuring Redshift data destination connections,
 * including support for schema management, COPY commands, and batch configurations.
 *
 * Usage example:
 * ```typescript
 * const config: RedshiftConfig = {
 *   connection: {
 *     host: 'my-cluster.xxxxx.region.redshift.amazonaws.com',
 *     port: 5439,
 *     database: 'dev',
 *     user: 'awsuser',
 *     password: 'mypassword'
 *   },
 *   schema: 'public',
 *   table: 'users',
 *   createTableOptions: {
 *     columns: [
 *       { name: 'id', type: 'INTEGER', primaryKey: true },
 *       { name: 'name', type: 'VARCHAR(255)', nullable: false },
 *       { name: 'created_at', type: 'TIMESTAMP' }
 *     ],
 *     distKey: 'id',
 *     sortKey: ['created_at']
 *   }
 * };
 * ```
 */
import { ClientConfig } from 'pg';

/**
 * Redshift column definition with additional Redshift-specific options.
 */
export interface RedshiftColumn {
    /**
     * Column name.
     */
    name: string;

    /**
     * Redshift data type.
     * @example "VARCHAR(255)", "INTEGER", "TIMESTAMP"
     */
    type: string;

    /**
     * Whether the column can contain NULL values.
     * @default true
     */
    nullable?: boolean;

    /**
     * Whether this column is part of the primary key.
     * @default false
     */
    primaryKey?: boolean;

    /**
     * Default value for the column.
     */
    default?: string;

    /**
     * Column encoding for compression.
     * @example "lzo", "zstd", "raw"
     */
    encoding?: string;
}

/**
 * Base configuration for Redshift destination options.
 */
export interface BaseDataDestinationConfig {
    /**
     * The schema where the table exists or will be created.
     * @default "public"
     */
    schema: string;

    /**
     * The table name where data will be written.
     */
    table: string;

    /**
     * Options for creating the table if it doesn't exist.
     * If not provided, the table must already exist.
     */
    createTableOptions?: {
        /**
         * Column definitions for the table.
         */
        columns: RedshiftColumn[];

        /**
         * Distribution key for the table.
         * @example "user_id"
         */
        distKey?: string;

        /**
         * Sort keys for the table.
         * @example ["timestamp", "id"]
         */
        sortKey?: string[];

        /**
         * Distribution style.
         * @default "AUTO"
         */
        diststyle?: 'AUTO' | 'EVEN' | 'ALL' | 'KEY';
    };

    /**
     * Whether to truncate the table before inserting.
     * @default false
     */
    truncate?: boolean;

    /**
     * Maximum batch size for insert operations.
     * @default 1000
     */
    batchSize?: number;

    /**
     * Transaction options.
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
 * Redshift driver configuration.
 * Extends BaseDataDestinationConfig with connection options.
 */
export interface RedshiftConfig extends BaseDataDestinationConfig {
    /**
     * Connection configuration for Redshift cluster.
     * Extends pg.ClientConfig with Redshift-specific options.
     */
    connection: ClientConfig & {
        /**
         * Redshift SSL configuration.
         * @default true
         */
        ssl?: boolean | { rejectUnauthorized: boolean };
    };
}
