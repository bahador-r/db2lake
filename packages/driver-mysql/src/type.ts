/**
 * Type definitions for MySQL source driver interface.
 *
 * This module provides the IMySQLDriver interface, which extends the generic ISourceDriver
 * with MySQL-specific configuration. It is intended to be implemented by MySQL data source drivers
 * to support streaming and paginated data fetching from MySQL databases.
 *
 * Usage example:
 * ```typescript
 * class MySQLSourceDriver implements IMySQLDriver<MyRowType> {
 *   // Implementation...
 * }
 * ```
 */
import { ISourceDriver } from "@db2lake/core";

/**
 * MySQL driver interface for paginated and streaming data fetch operations.
 *
 * @template T - Type of data being fetched from MySQL
 * @extends ISourceDriver<T, MySQLConfig>
 */
export interface IMySQLDriver<T = any> extends ISourceDriver<T, MySQLConfig> {}

/**
 * Type definitions for MySQL source driver configuration.
 *
 * This module provides interfaces for configuring MySQL data source connections,
 * including support for cursor-based pagination and parameterized queries.
 *
 * Usage example:
 * ```typescript
 * const config: MySQLConfig = {
 *   query: "SELECT * FROM users WHERE id > ? LIMIT 100",
 *   params: [0],
 *   cursorField: "id",
 *   cursorParamsIndex: 0,
 *   connectionOptions: { host: "localhost", user: "root", database: "test" }
 * };
 * ```
 */
import { ConnectionOptions } from 'mysql2/promise';


/**
 * Base configuration for a paginated data source query.
 */
export interface BaseDataSourceConfig {
    /**
     * SQL query string with placeholders for parameters.
     * @example "SELECT * FROM table WHERE id > ? LIMIT 100"
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
 * MySQLConfig for connecting via connection options.
 * Extends BaseDataSourceConfig.
 */
export interface MySQLConfig extends BaseDataSourceConfig {
    /**
     * Connection options for mysql2/promise.
     */
    connectionOptions: ConnectionOptions;
}
export interface MySQLConfig extends BaseDataSourceConfig {
    /**
     * Connection URI string for MySQL.
     */
    connectionUri: string;
}