/**
 * Common interface for all source drivers
 * @template T - Type of data being fetched
 * @template C - Type of configuration, defaults to DataSourceConfig
 */
export interface ISourceDriver<T = any, C = any> {
    /**
     * Establish connection to the data source
     * This should be called before fetch if the driver requires a connection
     */
    connect(): Promise<void>;

    /**
     * Fetch data from the source based on configuration
     * Uses async generator pattern to stream data in chunks, improving memory efficiency
     * Each yield returns a batch of records according to the configured batch size
     * 
     * @example
     * ```typescript
     * // Using the generator in a for-await loop
     * for await (const batch of driver.fetch()) {
     *   await processBatch(batch);
     * }
     * 
     * // Or collecting all results if needed
     * const allResults = [];
     * for await (const batch of driver.fetch()) {
     *   allResults.push(...batch);
     * }
     * ```
     * 
     * @yields {Promise<T[]>} A promise resolving to an array of records in each batch
     */
    fetch(): AsyncGenerator<T[], void, unknown>;

    /**
     * Close any open connections
     * Should be implemented if the driver maintains connections
     */
    close(): Promise<void>;
}


/**
 * Common interface for all destination drivers
 * @template T - Type of data being written
 * @template C - Type of configuration, defaults to DataSinkConfig
 */
export interface IDestinationDriver<T = any, C = any> {
    /**
     * Establish connection to the destination
     * This should be called before insert if the driver requires a connection
     */
    connect(): Promise<void>;

    /**
     * Insert or upsert data into the destination
     * @param rows Array of records to insert
     */
    insert(rows: T[]): Promise<void>;

    /**
     * Close any open connections
     * Should be implemented if the driver maintains connections
     */
    close(): Promise<void>;
}
