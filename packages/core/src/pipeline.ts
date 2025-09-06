import { ISourceDriver, IDestinationDriver } from "./driver.type";
import { ITransformer, ILogger, LogLevel, PipelineCursor } from "./pipeline.type";

// Re-export types so consumers can import them from the pipeline module
export type { ITransformer, ILogger, LogLevel, PipelineCursor } from "./pipeline.type";

/**
 * Abstract pipeline class for orchestrating data flow from source to destination.
 * Handles connection management, data transformation, error handling, and progress tracking.
 * 
 * Features:
 * - Automatic connection management for source and destination
 * - Batch processing with cursor tracking for resumability
 * - Optional data transformation
 * - Comprehensive logging and metrics
 * - Error handling with proper cleanup
 *
 * @property source - The source driver instance that implements ISourceDriver
 * @property destination - The destination driver instance that implements IDestinationDriver
 * @property transformer - Optional transformer function to convert source data format to destination format
 * @property logger - Optional logger function for tracking pipeline events and errors
 *
 * @example
 * ```typescript 
 * const pipeline = new MyPipeline(
 *   new MySourceDriver(),
 *   new MyDestinationDriver(),
 *   (data) => data.map(transform),
 *   (level, msg, data) => console.log(level, msg, data)
 * );
 * 
 * try {
 *   await pipeline.run();
 * } catch (error) {
 *   console.error('Pipeline failed:', error);
 * }
 * ```
 */
abstract class IPipeline {
    private connected: boolean = false;
    private batchCount: number = 0;
    private totalRows: number = 0;
    private currentCursor: PipelineCursor | null = null;

    constructor(
        protected source: ISourceDriver,
        protected destination: IDestinationDriver,
        protected transformer?: ITransformer,
        protected logger?: ILogger
    ) { }

    /**
     * Main entry point for pipeline execution.
     * This abstract method must be implemented by concrete pipeline classes.
     * The typical implementation should:
     * 1. Connect to source and destination
     * 2. Process data
     * 3. Ensure cleanup is called, even if processing fails
     * 
     * @protected
     * @throws Will throw an error if connections fail or data processing encounters an error
     * 
     * @example
     * ```typescript
     * protected async run(): Promise<void> {
     *   await this.connect();
     *   try {
     *     await this.process();
     *   } finally {
     *     await this.cleanup();
     *   }
     * }
     * ```
     */
    public async run(): Promise<void> {
        await this.connect();
        try {
            await this.process();
        } finally {
            await this.cleanup();
        }
    }

    /**
     * Establishes connections to both source and destination.
     * This method is idempotent - calling it multiple times will only connect once.
     * 
     * @protected
     * @throws Will throw an error if either connection fails
     * @emits Logs 'info' events for connection status
     * @emits Logs 'error' event if connections fail
     */
    protected async connect(): Promise<void> {
        if (this.connected) return;

        try {
            this.log('info', 'Establishing connections...');
            await this.source.connect();
            await this.destination.connect();
            this.connected = true;
            this.log('info', 'Connections established successfully');
        } catch (error) {
            this.log('error', 'Failed to establish connections', error);
            await this.cleanup();
            throw error;
        }
    }

    /**
     * Main data processing loop.
     * Orchestrates the entire data pipeline:
     * 1. Fetches data in batches from the source
     * 2. Applies transformations if configured
     * 3. Writes transformed data to the destination
     * 4. Maintains cursor state for tracking progress
     * 5. Provides detailed logging of the process
     * 
     * @protected
     * @throws Will throw an error if batch processing fails
     * @emits Logs 'info' events for start/completion
     * @emits Logs 'debug' events for each batch
     * @emits Logs 'error' events for failures
     */
    protected async process(): Promise<void> {
        try {
            this.log('info', 'Starting data processing');
            
            for await (const batch of this.source.fetch()) {
                try {
                    // Transform data if transformer is provided
                    const transformedBatch = this.transformer 
                        ? this.transformer(batch)
                        : batch;

                    // Insert transformed data into destination
                    await this.destination.insert(transformedBatch);

                    // Update metrics
                    this.batchCount++;
                    this.totalRows += batch.length;

                    // Update cursor information
                    this.currentCursor = {
                        position: this.totalRows,
                        lastItem: batch[batch.length - 1],
                        timestamp: new Date().toISOString()
                    };
                    
                    this.log('debug', `Processed batch ${this.batchCount}`, {
                        batchSize: batch.length,
                        totalRows: this.totalRows,
                        cursor: this.currentCursor
                    });
                } catch (error) {
                    this.log('error', `Failed to process batch ${this.batchCount}`, {
                        error,
                        batchSize: batch.length,
                        cursor: this.currentCursor
                    });
                    throw error;
                }
            }

            this.log('info', 'Data processing completed', {
                totalBatches: this.batchCount,
                totalRows: this.totalRows,
                finalCursor: this.currentCursor
            });
        } catch (error) {
            this.log('error', 'Data processing failed', {
                error,
                lastCursor: this.currentCursor
            });
            throw error;
        }
    }

    /**
     * Cleanup resources by closing connections.
     * Attempts to close both source and destination connections, handling each independently
     * to ensure both are attempted even if one fails.
     * 
     * @protected
     * @throws Will throw an error if cleanup completely fails
     * @emits Logs 'info' events for cleanup status
     * @emits Logs 'error' events for individual connection close failures
     * 
     * @note Always call this method in a finally block to ensure resources are released
     * @note Includes current cursor state in cleanup logs for debugging/resumability
     */
    protected async cleanup(): Promise<void> {
        try {
            this.log('info', 'Cleaning up resources...');
            
            // Close source connection
            try {
                await this.source.close();
            } catch (error) {
                this.log('error', 'Failed to close source connection', error);
            }

            // Close destination connection
            try {
                await this.destination.close();
            } catch (error) {
                this.log('error', 'Failed to close destination connection', error);
            }

            this.connected = false;
            this.log('info', 'Cleanup completed');
        } catch (error) {
            this.log('error', 'Cleanup failed', error);
            throw error;
        }
    }

    /**
     * Helper method for consistent logging throughout the pipeline.
     * Only logs if a logger was provided in the constructor.
     * 
     * @protected
     * @param level - The severity level of the log (error, info, debug)
     * @param message - The main log message
     * @param data - Optional structured data to include in the log
     * 
     * @example
     * ```typescript
     * this.log('error', 'Failed to process batch', { 
     *   error, 
     *   batchId: 123,
     *   cursor: this.currentCursor 
     * });
     * ```
     */
    protected log(level: LogLevel, message: string, data?: any): void {
        if (this.logger) {
            this.logger(level, message, data);
        }
    }

    /**
     * Get current pipeline metrics and progress information.
     * Provides a snapshot of the pipeline's current state including:
     * - Number of batches processed
     * - Total rows processed
     * - Current cursor position for resumability
     * 
     * @public
     * @returns {Object} Pipeline metrics and cursor state
     * @returns {number} returns.batchCount - Number of batches processed
     * @returns {number} returns.totalRows - Total number of rows processed
     * @returns {PipelineCursor | null} returns.cursor - Current cursor state or null if no data processed
     * 
     * @example
     * ```typescript
     * const { batchCount, totalRows, cursor } = pipeline.getMetrics();
     * console.log(`Processed ${totalRows} rows in ${batchCount} batches`);
     * if (cursor) {
     *   console.log(`Last position: ${cursor.position}`);
     * }
     * ```
     */
    public getMetrics(): { batchCount: number; totalRows: number; cursor: PipelineCursor | null } {
        return {
            batchCount: this.batchCount,
            totalRows: this.totalRows,
            cursor: this.currentCursor
        };
    }
}

export class Pipeline extends IPipeline {}