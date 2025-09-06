/**
 * BigQuery destination driver implementation for high-performance data insertion.
 *
 * This module provides the BigQueryDestinationDriver class, which implements efficient
 * data loading into BigQuery tables. Key features:
 * - Automatic connection and resource management
 * - Dynamic dataset and table creation
 * - Optimized batch processing with configurable sizes
 * - High-performance streaming writes
 * - Automatic schema handling
 * - Robust error handling and cleanup
 *
 * The driver automatically manages connections, batches data for optimal performance,
 * and ensures proper cleanup of resources. It supports both traditional batch loading
 * and high-throughput streaming writes.
 */
import { BigQuery, Table } from '@google-cloud/bigquery';
import { IBigQueryDriver, BigQueryConfig } from "./type";

/**
 * BigQueryDestinationDriver provides a robust implementation for loading data into BigQuery.
 * 
 * Features:
 * - Lazy connection initialization
 * - Automatic resource management
 * - Configurable batch processing
 * - Support for streaming writes
 * - Dynamic table creation
 * 
 * @template T - Type of records to be inserted. Defaults to any.
 * @implements {IBigQueryDriver<T>}
 */
export class BigQueryDestinationDriver<T = any> implements IBigQueryDriver<T> {
    private client: BigQuery | null = null;
    private table: Table | null = null;
    private pendingRows: T[] = [];
    private writeStream: any | null = null;

    constructor(private config: BigQueryConfig) {}

    /**
     * Establishes a connection to BigQuery and prepares resources for data insertion.
     * 
     * This method:
     * 1. Initializes the BigQuery client with provided options
     * 2. Ensures the target dataset exists, creating it if necessary
     * 3. Verifies or creates the target table with specified schema
     * 4. Sets up streaming write capability if configured
     *
     * The connection is established lazily - you don't need to call this explicitly
     * as it will be called automatically on the first insert operation.
     *
     * @throws {Error} If connection fails due to invalid credentials or permissions
     * @throws {Error} If table creation fails or existing table is incompatible
     */
    async connect(): Promise<void> {
        if (!this.client) {
            this.client = new BigQuery(this.config.bigQueryOptions);

            // Get or create the dataset
            const dataset = this.client.dataset(this.config.dataset);
            const [datasetExists] = await dataset.exists();
            if (!datasetExists) {
                await dataset.create();
            }

            // Get or create the table
            this.table = dataset.table(this.config.table);
            const [tableExists] = await this.table.exists();

            if (!tableExists) {
                if (!this.config.createTableOptions) {
                    throw new Error(`Table ${this.config.dataset}.${this.config.table} does not exist and no creation options provided`);
                }

                await this.table.create({
                    schema: this.config.createTableOptions.schema,
                    expirationTime: this.config.createTableOptions.expirationTime,
                    description: this.config.createTableOptions.description
                });
            }

            // Initialize write stream if options provided
            if (this.config.writeOptions) {
                this.writeStream = this.table.createWriteStream(this.config.writeOptions);
            }
        }
    }

    /**
     * Inserts or appends data to the BigQuery table using optimized batch processing.
     * 
     * This method:
     * 1. Ensures connection is established
     * 2. Buffers incoming rows for batch processing
     * 3. Automatically flushes when batch size is reached
     * 4. Handles both streaming and standard insert modes
     *
     * The method implements intelligent batching to optimize performance while
     * keeping memory usage under control. Rows are accumulated until reaching
     * the configured batch size, then automatically flushed to BigQuery.
     *
     * @param rows - Array of records to insert. Each record should match the table schema.
     * @throws {Error} If insertion fails due to schema mismatch or API errors
     * @throws {Error} If connection cannot be established
     */
    async insert(rows: T[]): Promise<void> {
        if (!this.client || !this.table) {
            await this.connect();
        }

        // Add rows to pending batch
        this.pendingRows.push(...rows);

        // Process batch if it reaches the configured size
        if (this.pendingRows.length >= (this.config.batchSize || 1000)) {
            await this.flushBatch();
        }
    }

    /**
     * Processes the current batch of rows using the most efficient available method.
     * 
     * This method chooses the optimal insertion strategy:
     * - Uses streaming writes if configured (faster, real-time)
     * - Falls back to batch insert API (better for large batches)
     * 
     * The method automatically handles:
     * - Empty batch detection
     * - Write stream error handling
     * - Batch clearing after successful write
     *
     * @private
     * @throws {Error} If the write operation fails
     */
    private async flushBatch(): Promise<void> {
        if (this.pendingRows.length === 0) return;

        const rows = this.pendingRows;
        this.pendingRows = [];

        if (this.writeStream) {
            // Use write stream for better performance
            return new Promise((resolve, reject) => {
                this.writeStream.write(rows, (error: Error) => {
                    if (error) reject(error);
                    else resolve();
                });
            });
        } else {
            // Use standard insert API
            await this.table!.insert(rows);
        }
    }

    /**
     * Performs a clean shutdown of the BigQuery connection and associated resources.
     * 
     * This method ensures proper cleanup by:
     * 1. Flushing any pending rows in the batch buffer
     * 2. Properly closing the write stream if active
     * 3. Clearing all connection resources
     * 
     * It's crucial to call this method when done with the driver to:
     * - Prevent data loss from unflushed batches
     * - Release system resources
     * - Properly close network connections
     *
     * @throws {Error} If final flush operations fail
     */
    async close(): Promise<void> {
        if (this.pendingRows.length > 0) {
            await this.flushBatch();
        }

        if (this.writeStream) {
            await new Promise<void>((resolve, reject) => {
                this.writeStream.end((error: Error) => {
                    if (error) reject(error);
                    else resolve();
                });
            });
            this.writeStream = null;
        }

        this.table = null;
        this.client = null;
    }
}

export { BigQueryConfig } from './type';