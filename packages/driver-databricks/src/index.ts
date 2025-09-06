/**
 * Databricks destination driver implementation for high-performance data insertion.
 *
 * This module provides the DatabricksDestinationDriver class, which implements efficient
 * data loading into Databricks tables. Key features:
 * - Automatic connection and resource management
 * - Dynamic table creation with schema management
 * - Transaction support with automatic retries
 * - Optimized batch processing
 * - Robust error handling and cleanup
 */
import { DBSQLClient } from '@databricks/sql';
import { IDatabricksDriver, DatabricksConfig } from "./type";
/**
 * DatabricksDestinationDriver provides a robust implementation for loading data into Databricks.
 * 
 * Features:
 * - Lazy connection initialization
 * - Automatic resource management
 * - Configurable batch processing
 * - Transaction support
 * - Dynamic table creation
 * 
 * @template T - Type of records to be inserted. Defaults to any.
 * @implements {IDatabricksDriver<T>}
 */
export class DatabricksDestinationDriver<T = any> implements IDatabricksDriver<T> {
    private client: DBSQLClient | null = null;
    private connection: any | null = null;
    private pendingRows: T[] = [];
    private currentTransaction: boolean = false;

    constructor(private config: DatabricksConfig) {
        // Set default values
        this.config.batchSize = this.config.batchSize || 1000;
        this.config.writeMode = this.config.writeMode || 'append';
        this.config.transaction = {
            enabled: this.config.transaction?.enabled ?? true,
            maxRetries: this.config.transaction?.maxRetries ?? 3
        };
    }

    /**
     * Establishes a connection to Databricks and prepares resources for data insertion.
     * 
     * This method:
     * 1. Initializes the Databricks SQL client
     * 2. Establishes the connection to the warehouse
     * 3. Verifies or creates the target table with specified schema
     * 4. Prepares for transaction handling if enabled
     *
     * The connection is established lazily - you don't need to call this explicitly
     * as it will be called automatically on the first insert operation.
     *
     * @throws {Error} If connection fails due to invalid credentials or network issues
     * @throws {Error} If table creation fails or existing table is incompatible
     */
    async connect(): Promise<void> {
        if (!this.client) {
            this.client = new DBSQLClient();
            
            // Connect to Databricks SQL warehouse
            this.connection = await this.client.connect({
                host: this.config.connection.host,
                path: this.config.connection.path,
                token: this.config.connection.token
            });

            // Ensure database exists and is selected
            await this.connection.execute(`USE ${this.config.database}`);

            // Create table if needed
            if (this.config.createTableOptions) {
                await this.ensureTableExists();
            } else {
                // Verify table exists
                const [exists] = await this.connection.execute(
                    `SHOW TABLES IN ${this.config.database} LIKE '${this.config.table}'`
                );
                if (!exists) {
                    throw new Error(`Table ${this.config.database}.${this.config.table} does not exist and no creation options provided`);
                }
            }
        }
    }

    /**
     * Creates or verifies the target table with the specified schema.
     * 
     * @private
     * @throws {Error} If table creation fails
     */
    private async ensureTableExists(): Promise<void> {
        if (!this.connection || !this.config.createTableOptions) return;

        const { schema, properties, comment } = this.config.createTableOptions;

        // Generate CREATE TABLE statement
        const columnDefs = schema.map(col => {
            const columnDef = `${col.name} ${col.type}`;
            return col.comment ? `${columnDef} COMMENT '${col.comment}'` : columnDef;
        }).join(',\n  ');

        let createTableSQL = `
            CREATE TABLE IF NOT EXISTS ${this.config.database}.${this.config.table} (
              ${columnDefs}
            )
        `;

        // Add table properties if specified
        if (properties && Object.keys(properties).length > 0) {
            const props = Object.entries(properties)
                .map(([key, value]) => `'${key}'='${value}'`)
                .join(',\n  ');
            createTableSQL += `\nTBLPROPERTIES (\n  ${props}\n)`;
        }

        // Add table comment if specified
        if (comment) {
            createTableSQL += `\nCOMMENT '${comment}'`;
        }

        await this.connection.execute(createTableSQL);
    }

    /**
     * Inserts or appends data to the Databricks table using optimized batch processing.
     * 
     * This method:
     * 1. Ensures connection is established
     * 2. Buffers incoming rows for batch processing
     * 3. Automatically flushes when batch size is reached
     * 4. Handles transaction control
     *
     * The method implements intelligent batching to optimize performance while
     * keeping memory usage under control. Rows are accumulated until reaching
     * the configured batch size, then automatically flushed to Databricks.
     *
     * @param rows - Array of records to insert. Each record should match the table schema.
     * @throws {Error} If insertion fails due to schema mismatch or connection issues
     */
    async insert(rows: T[]): Promise<void> {
        if (!this.connection) {
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
     * Processes the current batch of rows with transaction support.
     * 
     * This method handles:
     * - Transaction management
     * - Batch insertion
     * - Error recovery with retries
     * - Automatic rollback on failure
     *
     * @private
     * @throws {Error} If the write operation fails after all retries
     */
    private async flushBatch(): Promise<void> {
        if (!this.connection || this.pendingRows.length === 0) return;

        const rows = this.pendingRows;
        this.pendingRows = [];

        let attempt = 0;
        while (attempt < (this.config.transaction?.maxRetries || 3)) {
            try {
                if (this.config.transaction?.enabled && !this.currentTransaction) {
                    await this.connection.execute('START TRANSACTION');
                    this.currentTransaction = true;
                }

                // Convert rows to SQL values and insert
                const values = rows.map(row => {
                    const rowValues = Object.values(row as Record<string, unknown>)
                        .map(value => {
                            if (value === null) return 'NULL';
                            if (typeof value === 'string') return `'${value.replace(/'/g, "''")}'`;
                            if (value instanceof Date) return `'${value.toISOString()}'`;
                            return String(value);
                        })
                        .join(', ');
                    return `(${rowValues})`;
                }).join(',\n');

                const insertSQL = `
                    INSERT INTO ${this.config.database}.${this.config.table}
                    VALUES ${values}
                `;

                await this.connection.execute(insertSQL);

                if (this.config.transaction?.enabled) {
                    await this.connection.execute('COMMIT');
                    this.currentTransaction = false;
                }

                break; // Success, exit retry loop
            } catch (error) {
                attempt++;

                if (this.currentTransaction) {
                    try {
                        await this.connection.execute('ROLLBACK');
                    } catch (rollbackError) {
                        // Log rollback error but throw original error
                        console.error('Rollback failed:', rollbackError);
                    }
                    this.currentTransaction = false;
                }

                if (attempt >= (this.config.transaction?.maxRetries || 3)) {
                    throw error; // Rethrow if we've exhausted retries
                }

                // Wait before retrying (exponential backoff)
                await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
            }
        }
    }

    /**
     * Performs a clean shutdown of the Databricks connection and associated resources.
     * 
     * This method ensures proper cleanup by:
     * 1. Flushing any pending rows in the batch buffer
     * 2. Committing or rolling back any active transaction
     * 3. Closing the connection and client
     * 
     * It's crucial to call this method when done with the driver to:
     * - Prevent data loss from unflushed batches
     * - Properly complete transactions
     * - Release system resources
     *
     * @throws {Error} If cleanup operations fail
     */
    async close(): Promise<void> {
        try {
            if (this.pendingRows.length > 0) {
                await this.flushBatch();
            }

            if (this.currentTransaction) {
                try {
                    await this.connection?.execute('COMMIT');
                } catch (error) {
                    await this.connection?.execute('ROLLBACK');
                    throw error;
                }
            }
        } finally {
            if (this.connection) {
                await this.connection.close();
                this.connection = null;
            }
            if (this.client) {
                await this.client.close();
                this.client = null;
            }
        }
    }
}

export { DatabricksConfig } from './type';