/**
 * Type definitions for Firestore source driver interface.
 *
 * This module provides the IFirestoreDriver interface, which extends the generic ISourceDriver
 * with Firestore-specific configuration. It is intended to be implemented by Firestore data source drivers
 * to support streaming and paginated data fetching from Firestore databases.
 *
 * Usage example:
 * ```typescript
 * class FirestoreSourceDriver implements IFirestoreDriver<MyDocType> {
 *   // Implementation...
 * }
 * ```
 */
import { ISourceDriver } from "@db2lake/core";

/**
 * Firestore driver interface for paginated and streaming data fetch operations.
 *
 * @template T - Type of data being fetched from Firestore
 * @extends ISourceDriver<T, FirestoreConfig>
 */
export interface IFirestoreDriver<T = any> extends ISourceDriver<T, FirestoreConfig> {}

/**
 * Type definitions for Firestore source driver configuration.
 *
 * This module provides interfaces for configuring Firestore data source connections,
 * including support for advanced query filtering, ordering, and cursor-based pagination
 * using Firestore's native cursor methods.
 *
 * Usage example:
 * ```typescript
 * const config: FirestoreConfig = {
 *   appOptions: {
 *     credential: admin.credential.cert(require('./service-account.json'))
 *   },
 *   collection: "users",
 *   where: [["age", ">", 18]],
 *   orderBy: [["lastName", "asc"], ["createdAt", "desc"]],
 *   limit: 100,
 *   startAfter: ["Smith", new Date("2025-01-01")] // cursor values matching orderBy fields
 * };
 * ```
 */
import { AppOptions } from 'firebase-admin/app';
import { WhereFilterOp, OrderByDirection } from 'firebase-admin/firestore';

/**
 * Base configuration for Firestore data source queries.
 */
export interface BaseDataSourceConfig {
    /**
     * Array of where conditions (field path, operator, value).
     * @example [["age", ">", 18], ["status", "==", "active"]]
     */
    where?: [string, WhereFilterOp, any][];

    /**
     * Array of order by specifications (field path, direction).
     * @example [["createdAt", "desc"], ["name", "asc"]]
     */
    orderBy?: [string, OrderByDirection][];

    /**
     * Maximum number of documents per batch.
     * @default 100
     */
    limit?: number;

    /**
     * Values to start query at (inclusive).
     * Values should match the order of fields in orderBy array.
     * @example ["Smith", 25] for orderBy: [["lastName", "asc"], ["age", "desc"]]
     */
    startAt?: any[];

    /**
     * Values to start query after (exclusive).
     * Values should match the order of fields in orderBy array.
     * @example ["Smith", 25] for orderBy: [["lastName", "asc"], ["age", "desc"]]
     */
    startAfter?: any[];

    /**
     * Values to end query before (exclusive).
     * Values should match the order of fields in orderBy array.
     * @example ["Wilson", 30] for orderBy: [["lastName", "asc"], ["age", "desc"]]
     */
    endBefore?: any[];

    /**
     * Values to end query at (inclusive).
     * Values should match the order of fields in orderBy array.
     * @example ["Wilson", 30] for orderBy: [["lastName", "asc"], ["age", "desc"]]
     */
    endAt?: any[];

}

/**
 * Firestore driver configuration.
 * Extends BaseDataSourceConfig.
 */
export interface FirestoreConfig extends BaseDataSourceConfig {
    /**
     * Available options to pass to {@link firebase-admin.app#initializeApp}.
     */
    appOptions: AppOptions;


    /**
     * Name of the Firestore app to use.
     * @example "my-app"
     */
    appName?: string;

    /**
     * Name or path of the collection to query.
     * @example "users" or "users/123/orders"
     */
    collection: string;
}
