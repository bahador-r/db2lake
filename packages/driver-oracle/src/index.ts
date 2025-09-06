/**
 * Oracle source driver implementation for paginated data fetching.
 *
 * Exports the `OracleSourceDriver` class which streams rows from an Oracle database
 * using an async generator (`fetch()`). The driver expects a configuration that
 * includes an SQL query, optional parameters, and optional cursor settings so it
 * can perform cursor-based pagination by replacing one parameter between pages.
 *
 * Important behavior notes:
 * - Connections are obtained from a `Pool` created with `oracledb.createPool(poolAttributes)`.
 * - `fetch()` yields arrays of rows (objects) until the query returns an empty result set
 *   or the configured `cursorField` cannot be read from the last row.
 * - If `cursorField` is provided, the driver will update `params[cursorParamsIndex]`
 *   with the last row's `cursorField` value and continue paging.
 * - Call `close()` to release the connection and close the pool when finished.
 *
 * Usage example:
 * ```typescript
 * const driver = new OracleSourceDriver(config);
 * for await (const batch of driver.fetch()) {
 *   // batch is an array of row objects
 * }
 * await driver.close();
 * ```
 */
import oracledb, { Connection, Pool } from 'oracledb';
import { IOracleDriver, OracleConfig } from "./type";

/**
 * OracleSourceDriver streams data from an Oracle database using cursor-based pagination.
 *
 * Contract:
 * - Inputs: `OracleConfig` (see `src/type.ts`) describing `query`, `params`, and pool attributes.
 * - Outputs: `fetch()` yields `any[]` batches of rows until no more data is available.
 * - Errors: network/driver errors from `oracledb` are propagated to the caller.
 */
export class OracleSourceDriver implements IOracleDriver {
    private pool: Pool | null = null;
    private connection: Connection | null = null;
    constructor(private config: OracleConfig) {}

    /**
     * Establish a pool and a connection from the pool.
     *
     * - If the pool already exists, it will be reused.
     * - Throws an Error if `poolAttributes` are not provided in the config.
     * - Propagates any errors thrown by `oracledb.createPool` or `pool.getConnection`.
     */
    async connect(): Promise<void> {
        if (!this.config.poolAttributes) throw new Error('Missing pool attributes for Oracle');

        if (!this.pool) {
            this.pool = await oracledb.createPool(this.config.poolAttributes);
        }
        if (!this.connection) {
            this.connection = await this.pool.getConnection();
        }
    }

    /**
     * Async generator that yields batches of rows from the configured query.
     *
     * Behavior and edge cases:
     * - If no connection exists, `connect()` is called automatically.
     * - `params` are cloned from the config so the original array is not mutated.
     * - If `cursorField` and `cursorParamsIndex` are configured, the driver will
     *   replace `params[cursorParamsIndex]` with the last row's `cursorField` value
     *   for the subsequent query. If the last row does not contain `cursorField`,
     *   pagination stops.
     * - If `cursorField` is not provided the driver yields the first batch and stops.
     * - Any error from `connection.execute` is thrown to the caller.
     *
     * Yields:
     * - `any[]` - array of row objects (outFormat: OBJECT)
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

            // Execute using object output format for ease of use
            const result = await this.connection!.execute(this.config.query, params, { outFormat: oracledb.OUT_FORMAT_OBJECT });
            const rows = result.rows as any[];
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
                    // If the expected cursor field is missing, stop paging to avoid an infinite loop
                    hasMore = false;
                }
            } else {
                // No cursor configured - return only the first batch
                hasMore = false;
            }
        }
    }

    /**
     * Close and cleanup resources:
     * - Closes the active connection if present.
     * - Closes the pool.
     *
     * Errors thrown by the underlying driver are propagated, but callers should
     * typically swallow or log close errors since they are often invoked during
     * shutdown/cleanup.
     */
    async close(): Promise<void> {
        if (this.connection) {
            await this.connection.close();
            this.connection = null;
        }
        if (this.pool) {
            await this.pool.close();
            this.pool = null;
        }
    }
}

export { OracleConfig } from './type';
