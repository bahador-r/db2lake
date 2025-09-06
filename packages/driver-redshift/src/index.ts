/**
 * Redshift destination driver implementation for data insertion operations.
 *
 * This module provides an implementation of the IRedshiftDriver interface using the
 * 'pg' package for PostgreSQL/Redshift connectivity. It supports:
 * - Connection pooling
 * - Batch data insertion
 * - Transaction management
 * - Error handling and retries
 * 
 * @module RedshiftDestinationDriver
 */
import { Pool, PoolClient } from 'pg';
import { IRedshiftDriver, RedshiftConfig } from "./type";

/**
 * Implementation of the Redshift destination driver.
 *
 * @template T - Type of data being written to Redshift
 * @implements {IRedshiftDriver<T>}
 */
export class RedshiftDestinationDriver<T extends Record<string, any>> implements IRedshiftDriver<T> {
  private pool: Pool | null = null;
  private client: PoolClient | null = null;
  private config: RedshiftConfig;

  /**
   * Creates an instance of RedshiftDestinationDriver.
   * @param {RedshiftConfig} config - Configuration for Redshift connection and operations
   */
  constructor(config: RedshiftConfig) {
    this.config = config;
  }

  /**
   * Establishes a connection to the Redshift cluster.
   * Creates a connection pool and acquires an initial client.
   */
  async connect(): Promise<void> {
    try {
      this.pool = new Pool(this.config.connection);

      // Test connection by acquiring a client
      this.client = await this.pool.connect();

      // Create table if needed
      if (this.config.createTableOptions) {
        await this.createTable();
      }
    } catch (error) {
      throw new Error(`Failed to connect to Redshift: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Creates the target table if it doesn't exist.
   * @private
   */
  private async createTable(): Promise<void> {
    if (!this.client || !this.config.createTableOptions) return;

    const { columns, distKey, sortKey, diststyle = 'AUTO' } = this.config.createTableOptions;
    const tableName = `${this.config.schema}.${this.config.table}`;

    // Build column definitions
    const columnDefs = columns.map(col => {
      const parts = [
        col.name,
        col.type,
        col.nullable === false ? 'NOT NULL' : '',
        col.default ? `DEFAULT ${col.default}` : '',
        col.encoding ? `ENCODE ${col.encoding}` : ''
      ].filter(Boolean);
      return parts.join(' ');
    });

    // Build distribution and sort key clauses
    const distKeyClause = distKey ? `DISTKEY(${distKey})` : '';
    const sortKeyClause = sortKey?.length ? `SORTKEY(${sortKey.join(', ')})` : '';

    const query = `
      CREATE TABLE IF NOT EXISTS ${tableName} (
        ${columnDefs.join(',\n        ')}
      )
      DISTSTYLE ${diststyle}
      ${distKeyClause}
      ${sortKeyClause}
    `;

    await this.client.query(query);
  }

  /**
   * Inserts data in batches into the specified Redshift table.
   *
   * @param {T[]} rows - Array of data objects to insert
   * @returns {Promise<void>}
   */
  async insert(rows: T[]): Promise<void> {
    if (!this.client || !this.pool) {
      throw new Error('Not connected to Redshift. Call connect() first.');
    }

    if (rows.length === 0) return;

    const tableName = `${this.config.schema}.${this.config.table}`;
    const maxRetries = this.config.transaction?.maxRetries ?? 3;
    let retryCount = 0;

    const executeInsert = async () => {
      try {
        // Truncate if requested
        if (this.config.truncate) {
          await this.client!.query(`TRUNCATE TABLE ${tableName}`);
        }

        // Start transaction if enabled
        if (this.config.transaction?.enabled !== false) {
          await this.client!.query('BEGIN');
        }

        // Prepare columns and placeholders for the query
        const sample = rows[0];
        const columns = Object.keys(sample);
        const placeholders = columns.map((_, i) => `$${i + 1}`).join(', ');
        const query = `INSERT INTO ${tableName} (${columns.join(', ')}) VALUES (${placeholders})`;

        // Process in batches
        const batchSize = this.config.batchSize ?? 1000;
        for (let i = 0; i < rows.length; i += batchSize) {
          const batch = rows.slice(i, i + batchSize);
          
          await Promise.all(
            batch.map(row => {
              const values = columns.map(col => row[col]);
              return this.client!.query(query, values);
            })
          );
        }

        // Commit transaction if enabled
        if (this.config.transaction?.enabled !== false) {
          await this.client!.query('COMMIT');
        }
      } catch (error) {
        // Rollback transaction on error if enabled
        if (this.config.transaction?.enabled !== false && this.client) {
          await this.client.query('ROLLBACK');
        }

        // Retry on transient errors
        if (retryCount < maxRetries) {
          retryCount++;
          return executeInsert();
        }

        throw error;
      }
    };

    try {
      await executeInsert();
    } catch (error) {
      throw new Error(`Failed to insert data into Redshift: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Closes all connections and releases resources.
   */
  async close(): Promise<void> {
    try {
      if (this.client) {
        this.client.release();
        this.client = null;
      }
      
      if (this.pool) {
        await this.pool.end();
        this.pool = null;
      }
    } catch (error) {
      throw new Error(`Failed to close Redshift connection: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}

export { RedshiftConfig } from './type';