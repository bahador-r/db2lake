/**
 * Log levels supported by the pipeline
 * Determines the verbosity and type of messages that will be logged
 * 
 * - error: Only error messages
 * - info: Error and informational messages
 * - debug: All messages including debug information
 * 
 * @example
 * ```typescript
 * const level: LogLevel = "info";  // Log errors and info messages
 * ```
 */
export type LogLevel = "error" | "info" | "debug";

/**
 * Logger function type for pipeline logging
 *
 * @param level - The log level (error, info, debug)
 * @param message - The log message
 * @param data - Optional additional data to log (e.g., error details, context)
 *
 * @example
 * logger("error", "Failed to connect", { error });
 */
export type ILogger = (level: LogLevel, message: string, data?: any) => void;

/**
 * Transformer function type for converting source data to destination format
 *
 * @template T - Type of input data
 * @template U - Type of output data
 * @param sourceData - Array of source records to transform
 * @returns Array of transformed records
 *
 * @example
 * const transformer: ITransformer<SourceType, DestType> = (data) => data.map(transformFn);
 */
export type ITransformer<T = any, U = any> = (sourceData: T[]) => U[];


/**
 * Represents cursor information for tracking pipeline progress
 */
export interface PipelineCursor {
    /**
     * Current position in the data stream
     */
    position: number;

    /**
     * Last processed item
     */
    lastItem: any;

    /**
     * Timestamp of when this cursor was created
     */
    timestamp: string;
}
