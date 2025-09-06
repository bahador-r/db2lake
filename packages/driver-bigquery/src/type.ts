/**
 * Interface definition for BigQuery destination driver.
 *
 * This module extends the generic IDestinationDriver interface with BigQuery-specific
 * configuration and typing. It provides the contract for implementing BigQuery destination
 * drivers that support:
 * - Batch data insertion
 * - Streaming writes
 * - Table creation and management
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
 * class BigQueryDestinationDriver implements IBigQueryDriver<UserRecord> {
 *   async insert(rows: UserRecord[]): Promise<void> {
 *     // Type-safe implementation...
 *   }
 * }
 * ```
 */
import { IDestinationDriver } from "@db2lake/core";

/**
 * BigQuery driver interface for batch data insertion operations.
 *
 * @template T - Type of data being written to BigQuery
 * @extends IDestinationDriver<T, BigQueryConfig>
 */
export interface IBigQueryDriver<T = any> extends IDestinationDriver<T, BigQueryConfig> {}

/**
 * Type definitions for BigQuery destination driver configuration.
 *
 * This module provides interfaces for configuring BigQuery data destinations, including:
 * - Dataset and table specifications
 * - Automatic table creation with schema definitions
 * - Write stream configuration for optimized loading
 * - Batch size and write disposition controls
 *
 * Usage example:
 * ```typescript
 * const config: BigQueryConfig = {
 *   bigQueryOptions: {
 *     keyFilename: './service-account.json',
 *     projectId: 'my-project'
 *   },
 *   dataset: 'my_dataset',
 *   table: 'my_table',
 *   createTableOptions: {
 *     schema: [
 *       { name: 'name', type: 'STRING' },
 *       { name: 'age', type: 'INTEGER' },
 *       { name: 'active', type: 'BOOLEAN' }
 *     ],
 *     description: 'User records table'
 *   },
 *   writeDisposition: 'WRITE_APPEND',
 *   batchSize: 1000
 * };
 * ```
 */
import { BigQueryOptions, TableMetadata, JobLoadMetadata } from '@google-cloud/bigquery';

/**
 * Base configuration for BigQuery destination options.
 */
export interface BaseDataDestinationConfig {
    /**
     * The BigQuery dataset ID where the table exists or will be created.
     * @example "my_dataset"
     */
    dataset: string;

    /**
     * The BigQuery table ID where data will be written.
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
         * Can be a string in the format "field1:type1,field2:type2" or a TableSchema object.
         */
        schema: string | TableMetadata['schema'];

        /**
         * Time when table should be deleted, in ms from epoch.
         * If not provided, the table will not expire.
         */
        expirationTime?: number;

        /**
         * Table description.
         */
        description?: string;
    };

    /**
     * Options for the write stream.
     */
    writeOptions?: string | JobLoadMetadata;

    /**
     * Whether to append to or overwrite the table.
     * @default "WRITE_APPEND"
     */
    writeDisposition?: 'WRITE_APPEND' | 'WRITE_TRUNCATE';

    /**
     * Maximum batch size for insert operations.
     * @default 1000
     */
    batchSize?: number;
}

/**
 * BigQuery driver configuration.
 * Extends BaseDataDestinationConfig.
 */
export interface BigQueryConfig extends BaseDataDestinationConfig {
    /**
     * BigQuery client options including authentication.
     * See: https://googleapis.dev/nodejs/bigquery/latest/global.html#BigQueryOptions
     */
    bigQueryOptions: BigQueryOptions;
}
