/**
 * Type definitions for Oracle source driver interface.
 *
 * This module provides the IOracleDriver interface, which extends the generic ISourceDriver
 * with Oracle-specific configuration. It is intended to be implemented by Oracle data source drivers
 * to support streaming and paginated data fetching from Oracle databases.
 *
 * Usage example:
 * ```typescript
 * class OracleSourceDriver implements IOracleDriver<MyRowType> {
 *   // Implementation...
 * }
 * ```
 */
import { ISourceDriver } from "@db2lake/core";

/**
 * Oracle driver interface for paginated and streaming data fetch operations.
 *
 * @template T - Type of data being fetched from Oracle
 * @extends ISourceDriver<T, OracleConfig>
 */
export interface IOracleDriver<T = any> extends ISourceDriver<T, OracleConfig> {}

/**
 * Type definitions for Oracle source driver configuration.
 *
 * This module provides interfaces for configuring Oracle data source connections,
 * including support for cursor-based pagination and parameterized queries.
 *
 * Usage example:
 * ```typescript
 * const config: OracleConfig = {
 *   query: "SELECT * FROM users WHERE id > :id OFFSET 0 ROWS FETCH NEXT 100 ROWS ONLY",
 *   params: [0],
 *   cursorField: "id",
 *   cursorParamsIndex: 0,
 *   connectionOptions: { user: "system", password: "oracle", connectString: "localhost/XEPDB1" }
 * };
 * ```
 */
import { PoolAttributes } from 'oracledb';

/**
 * Base configuration for a paginated data source query.
 */
export interface BaseDataSourceConfig {
    /**
     * SQL query string with placeholders for parameters.
     * @example "SELECT * FROM table WHERE id > :id OFFSET 0 ROWS FETCH NEXT 100 ROWS ONLY"
     */
    query: string;

    /**
     * Array of parameters to be used in the query.
     * @example [0]
     */
    params: any[];

    /**
     * Name of the field used for cursor-based pagination.
     * @example "id"
     */
    cursorField: string;

    /**
     * Index in the params array where the cursor value should be updated.
     * @example 0
     */
    cursorParamsIndex: number;
}

/**
 * OracleConfig for connecting via connection options.
 * Extends BaseDataSourceConfig.
 */
export interface OracleConfig extends BaseDataSourceConfig {
    /**
     * Connection options for oracledb Pool.
     */
    poolAttributes?: PoolAttributes;
}
