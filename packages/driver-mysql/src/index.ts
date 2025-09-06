/**
 * MySQL source driver implementation for paginated data fetching.
 *
 * This module provides the MySQLSourceDriver class, which connects to a MySQL database
 * and streams data in batches using a generator. It supports cursor-based pagination
 * by updating the cursor value after each batch and using it in subsequent queries.
 *
 * Usage example:
 * ```typescript
 * const driver = new MySQLSourceDriver(config);
 * for await (const batch of driver.fetch()) {
 *   processBatch(batch);
 * }
 * await driver.close();
 * ```
 */
import { Connection, createConnection } from 'mysql2/promise';
import { IMySQLDriver, MySQLConfig } from "./type";

/**
 * MySQLSourceDriver streams data from a MySQL database using cursor-based pagination.
 */
export class MySQLSourceDriver implements IMySQLDriver {

    /**
     * MySQL connection instance
     */
    private connection: Connection | null = null;

    /**
     * Create a new MySQLSourceDriver
     * @param config - MySQLConfig containing query, params, cursorField, cursorParamsIndex, and connection options
     */
    constructor(private config: MySQLConfig) {}

    /**
     * Fetches data from MySQL in batches using a generator.
     * Supports cursor-based pagination by updating the cursor value after each batch.
     *
     * @yields {Promise<any[]>} Array of rows for each batch
     * @example
     * for await (const batch of driver.fetch()) {
     *   processBatch(batch);
     * }
     */
    async *fetch(): AsyncGenerator<any[], void, unknown> {
        if (!this.connection) {
            await this.connect();
        }

        let cursorValue: any = undefined;
        let hasMore = true;
        let params = Array.isArray(this.config.params) ? [...this.config.params] : [];

        while (hasMore) {
            // If cursorField is set, update params at cursorParamsIndex
            if (this.config.cursorField && typeof this.config.cursorParamsIndex === 'number' && cursorValue !== undefined) {
                params[this.config.cursorParamsIndex] = cursorValue;
            }

            // Use the query and params from config
            const [rows] = await (this.connection as any).execute(this.config.query, params);
            if (!rows || rows.length === 0) {
                hasMore = false;
                break;
            }
            yield rows;

            // Update cursorValue for next page
            if (this.config.cursorField) {
                const lastRow = rows[rows.length - 1];
                if (lastRow && lastRow[this.config.cursorField] !== undefined) {
                    cursorValue = lastRow[this.config.cursorField];
                } else {
                    hasMore = false;
                }
            } else {
                hasMore = false;
            }
        }
    }

    /**
     * Closes the MySQL connection if open.
     */
    async close(): Promise<void> {
        if (this.connection) {
            await this.connection.end();
            this.connection = null;
        }
    }

    /**
     * Establishes a connection to the MySQL database using config options or URI.
     */
    async connect(): Promise<void> {       
        this.connection = await createConnection(this.config.connectionOptions || this.config.connectionUri);
    }
}

export { MySQLConfig } from './type';
