/**
 * Postgres source driver implementation for paginated data fetching.
 *
 * This module provides the PostgresSourceDriver class, which connects to a PostgreSQL database
 * and streams data in batches using a generator. It supports cursor-based pagination
 * by updating the cursor value after each batch and using it in subsequent queries.
 *
 * Usage example:
 * ```typescript
 * const driver = new PostgresSourceDriver(config);
 * for await (const batch of driver.fetch()) {
 *   processBatch(batch);
 * }
 * await driver.close();
 * ```
 */
import { Pool, PoolClient } from 'pg';
import { IPostgresDriver, PostgresConfig } from "./type";

/**
 * PostgresSourceDriver streams data from a PostgreSQL database using cursor-based pagination.
 */
export class PostgresSourceDriver implements IPostgresDriver {
    private pool: Pool;
    private client: PoolClient | null = null;
    constructor(private config: PostgresConfig) {
        this.pool = new Pool(this.config.poolConfig);
    }
    /**
     * Establishes a connection to the PostgreSQL database using the provided configuration.
     * If already connected, does nothing.
     */
    async connect(): Promise<void> {
        if (!this.client) {
            this.client = await this.pool.connect();
        }
    }

    /**
     * Fetches data from PostgreSQL in batches using a generator.
     * Supports cursor-based pagination by updating the cursor value after each batch.
     *
     * @yields {Promise<any[]>} Array of rows for each batch
     * @example
     * for await (const batch of driver.fetch()) {
     *   processBatch(batch);
     * }
     */
    async *fetch(): AsyncGenerator<any[], void, unknown> {
        if (!this.client) {
            await this.connect();
        }
        if (!this.client) throw new Error('Database client is not initialized');

        let cursorValue: any = undefined;
        let hasMore = true;
        let params = Array.isArray(this.config.params) ? [...this.config.params] : [];

        while (hasMore) {
            // If cursorField is set, update params at cursorParamsIndex
            if (this.config.cursorField && typeof this.config.cursorParamsIndex === 'number' && cursorValue !== undefined) {
                params[this.config.cursorParamsIndex] = cursorValue;
            }

            // Use the query and params from config
            const result = await this.client.query(this.config.query, params);
            const rows = result.rows;
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
     * Closes the PostgreSQL connection and releases resources.
     */
    async close(): Promise<void> {
        if (this.client) {
            try {
                await this.client.release();
            } catch (error) {
                console.error('Error releasing client:', error);
            } finally {
                this.client = null;
            }
        }
        try {
            await this.pool.end();
        } catch (error) {
            console.error('Error ending pool:', error);
        }
    }
}

export type { PostgresConfig } from './type';
