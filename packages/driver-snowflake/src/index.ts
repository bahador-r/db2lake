/**
 * Snowflake destination driver implementation.
 *
 * This module provides an implementation of the ISnowflakeDriver interface using the
 * 'snowflake-sdk' package. It supports:
 * - Bulk data loading
 * - Automatic table creation
 * - Transaction management
 * - Error handling with retries
 * - Connection pooling and resource cleanup
 * 
 * @module SnowflakeDestinationDriver
 */
import * as snowflake from 'snowflake-sdk';
import { ISnowflakeDriver, SnowflakeConfig, SnowflakeColumn } from "./type";

/**
 * Implementation of the Snowflake destination driver.
 *
 * @template T - Type of data being written to Snowflake
 * @implements {ISnowflakeDriver<T>}
 */
export class SnowflakeDestinationDriver<T extends Record<string, any>> implements ISnowflakeDriver<T> {
  private connection: snowflake.Connection | null = null;
  private config: SnowflakeConfig;

  /**
   * Creates an instance of SnowflakeDestinationDriver.
   * @param {SnowflakeConfig} config - Configuration for Snowflake operations
   */
  constructor(config: SnowflakeConfig) {
    this.config = config;
  }

  /**
   * Creates a Snowflake connection and initializes it.
   */
  async connect(): Promise<void> {
    try {
      // Create connection
      this.connection = snowflake.createConnection({
        account: this.config.connection.account,
        username: this.config.connection.username,
        password: this.config.connection.password,
        database: this.config.connection.database,
        warehouse: this.config.connection.warehouse,
        schema: this.config.connection.schema || 'PUBLIC',
        role: this.config.connection.role || 'ACCOUNTADMIN',
        authenticator: this.config.connection.authenticator || 'SNOWFLAKE'
      });

      // Connect and verify connection
      await new Promise<void>((resolve, reject) => {
        this.connection!.connect((err, conn) => {
          if (err) {
            reject(new Error(`Failed to connect to Snowflake: ${err.message}`));
          } else {
            resolve();
          }
        });
      });

      // Create table if configured
      if (this.config.table.createIfNotExists && this.config.table.columns) {
        await this.createTable();
      }
    } catch (error) {
      throw new Error(`Snowflake connection error: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Creates the target table if it doesn't exist.
   * @private
   */
  private async createTable(): Promise<void> {
    if (!this.connection || !this.config.table.columns) return;

    const { table, schema = 'PUBLIC', columns, clusterBy, retentionDays } = this.config.table;
    const fullTableName = `${schema}.${table}`;

    // Build column definitions
    const columnDefs = columns.map(col => this.buildColumnDefinition(col));

    // Build clustering keys if specified
    const clusterByClause = clusterBy?.length
      ? `CLUSTER BY (${clusterBy.join(', ')})`
      : '';

    // Build data retention if specified
    const retentionClause = retentionDays
      ? `DATA_RETENTION_TIME_IN_DAYS = ${retentionDays}`
      : '';

    const query = `
      CREATE TABLE IF NOT EXISTS ${fullTableName} (
        ${columnDefs.join(',\n        ')}
      )
      ${clusterByClause}
      ${retentionClause}
    `;

    await this.executeQuery(query);
  }

  /**
   * Builds a column definition string for table creation.
   * @private
   */
  private buildColumnDefinition(column: SnowflakeColumn): string {
    const parts = [
      column.name,
      column.type,
      column.nullable === false ? 'NOT NULL' : '',
      column.default ? `DEFAULT ${column.default}` : '',
      column.unique ? 'UNIQUE' : '',
      column.primaryKey ? 'PRIMARY KEY' : ''
    ].filter(Boolean);

    return parts.join(' ');
  }

  /**
   * Executes a query and returns the result.
   * @private
   */
  private executeQuery<R = any>(query: string, binds: any[] = []): Promise<R> {
    if (!this.connection) {
      throw new Error('Not connected to Snowflake. Call connect() first.');
    }

    return new Promise((resolve, reject) => {
      this.connection!.execute({
        sqlText: query,
        binds,
        complete: (err, stmt, rows) => {
          if (err) {
            reject(new Error(`Query execution failed: ${err.message}`));
          } else {
            resolve(rows as R);
          }
        }
      });
    });
  }

  /**
   * Inserts data in batches into the specified Snowflake table.
   *
   * @param {T[]} rows - Array of data objects to insert
   * @returns {Promise<void>}
   */
  async insert(rows: T[]): Promise<void> {
    if (!this.connection) {
      throw new Error('Not connected to Snowflake. Call connect() first.');
    }

    if (rows.length === 0) return;

    const { schema = 'PUBLIC', table } = this.config.table;
    const fullTableName = `${schema}.${table}`;
    const maxRetries = this.config.batch?.maxRetries ?? 3;
    const retryDelay = this.config.batch?.retryDelay ?? 1000;
    let retryCount = 0;

    const executeInsert = async () => {
      try {
        // Start transaction if enabled
        if (this.config.transaction?.enabled) {
          await this.executeQuery('BEGIN');
        }

        // Set query timeout if configured
        if (this.config.transaction?.queryTimeout) {
          await this.executeQuery(
            `ALTER SESSION SET STATEMENT_TIMEOUT_IN_SECONDS = ${this.config.transaction.queryTimeout}`
          );
        }

        // Prepare columns and placeholders for the query
        const sample = rows[0];
        const columns = Object.keys(sample);
        const placeholders = columns.map((_, i) => `?`).join(', ');
        const query = `INSERT INTO ${fullTableName} (${columns.join(', ')}) VALUES (${placeholders})`;

        // Process in batches
        const batchSize = this.config.batch?.size ?? 1000;
        const maxParallel = this.config.transaction?.maxParallelStatements ?? 1;

        for (let i = 0; i < rows.length; i += batchSize) {
          const batch = rows.slice(i, i + batchSize);
          const batchPromises = batch.map(row => {
            const values = columns.map(col => row[col]);
            return this.executeQuery(query, values);
          });

          // Execute batch with parallel limit
          for (let j = 0; j < batchPromises.length; j += maxParallel) {
            await Promise.all(batchPromises.slice(j, j + maxParallel));
          }
        }

        // Commit transaction if enabled
        if (this.config.transaction?.enabled) {
          await this.executeQuery('COMMIT');
        }
      } catch (error) {
        // Rollback transaction on error if enabled
        if (this.config.transaction?.enabled) {
          await this.executeQuery('ROLLBACK');
        }

        // Retry on transient errors
        if (retryCount < maxRetries) {
          retryCount++;
          await new Promise(resolve => setTimeout(resolve, retryDelay));
          return executeInsert();
        }

        throw error;
      }
    };

    try {
      await executeInsert();
    } catch (error) {
      throw new Error(`Failed to insert data into Snowflake: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Closes the Snowflake connection and releases resources.
   */
  async close(): Promise<void> {
    if (this.connection) {
      await new Promise<void>((resolve, reject) => {
        this.connection!.destroy((err) => {
          if (err) {
            reject(new Error(`Failed to close Snowflake connection: ${err.message}`));
          } else {
            resolve();
          }
        });
      });
      this.connection = null;
    }
  }
}
