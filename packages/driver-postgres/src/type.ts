/**
 * Type definitions for Postgres source driver interface.
 *
 * This module provides the IPostgresDriver interface, which extends the generic ISourceDriver
 * with Postgres-specific configuration. It is intended to be implemented by Postgres data source drivers
 * to support streaming and paginated data fetching from PostgreSQL databases.
 *
 * Usage example:
 * ```typescript
 * class PostgresSourceDriver implements IPostgresDriver<MyRowType> {
 *   // Implementation...
 * }
 * ```
 */
import { ISourceDriver } from "@db2lake/core";

/**
 * Postgres driver interface for paginated and streaming data fetch operations.
 *
 * @template T - Type of data being fetched from PostgreSQL
 * @extends ISourceDriver<T, PostgresConfig>
 */
export interface IPostgresDriver<T = any> extends ISourceDriver<T, PostgresConfig> {}

/**
 * Type definitions for Postgres source driver configuration.
 *
 * This module provides interfaces for configuring Postgres data source connections,
 * including support for cursor-based pagination and parameterized queries.
 *
 * Usage example:
 * ```typescript
 * const config: PostgresConfig = {
 *   query: "SELECT * FROM users WHERE id > $1 LIMIT 100",
 *   params: [0],
 *   cursorField: "id",
 *   cursorParamsIndex: 0,
 *   connectionOptions: { connectionString: "postgres://user:pass@localhost:5432/db" }
 * };
 * ```
 */
import { PoolConfig } from 'pg';

/**
 * Base configuration for a paginated data source query.
 */
export interface BaseDataSourceConfig {
	/**
	 * SQL query string with placeholders for parameters.
	 * @example "SELECT * FROM table WHERE id > $1 LIMIT 100"
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
 * PostgresConfig for connecting via connection options.
 * Extends BaseDataSourceConfig.
 */
export interface PostgresConfig extends BaseDataSourceConfig {
	/**
	 * Connection options for pg.Pool.
	 */
	poolConfig?: PoolConfig;
}

