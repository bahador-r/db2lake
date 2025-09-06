/**
 * Firestore source driver implementation for efficient data streaming.
 *
 * This module provides the FirestoreSourceDriver class, which connects to a Firestore database
 * and streams data in batches using an async generator. It implements:
 * - Efficient batch fetching with configurable batch sizes
 * - Advanced query filtering with where conditions
 * - Flexible ordering with multiple fields and directions
 * - Cursor-based pagination using Firestore's native cursor methods
 * - Automatic batch management using document snapshots
 */
import { initializeApp } from 'firebase-admin/app';
import { getFirestore, QueryDocumentSnapshot, Firestore, Query, DocumentData } from 'firebase-admin/firestore';
import { IFirestoreDriver, FirestoreConfig } from "./type";

/**
 * FirestoreSourceDriver implements efficient data streaming from Firestore collections.
 * It manages connection lifecycle and provides cursor-based pagination with
 * automatic batch management using document snapshots.
 */
export class FirestoreSourceDriver implements IFirestoreDriver {
    private db: Firestore | null = null;
    private lastDocumentSnapshot: QueryDocumentSnapshot | null = null;
    
    constructor(private config: FirestoreConfig) {}

    /**
     * Establishes a connection to Firestore using the configured application options.
     * Creates a new Firebase app instance if needed, using the optional appName for 
     * multi-app scenarios. This method is automatically called by fetch() if no
     * connection exists.
     *
     * @throws {FirebaseError} If connection fails due to invalid credentials or network issues
     */
    async connect(): Promise<void> {
        if (!this.db) {
            const app = initializeApp(this.config.appOptions, this.config.appName);
            this.db = getFirestore(app);
        }
    }

    /**
     * Fetches data from Firestore in batches using an async generator.
     * 
     * Features:
     * - Automatic connection management
     * - Query building with where conditions and orderBy clauses
     * - Cursor-based pagination with startAt, startAfter, endAt, endBefore
     * - Efficient batch processing using document snapshots
     *
     * @yields {Promise<Array<{id: string} & DocumentData>>} Array of documents for each batch,
     *         where each document is a plain object with 'id' field and document data
     * @throws {FirebaseError} If query execution fails
     */
    async *fetch(): AsyncGenerator<any[], void, unknown> {
        if (!this.db) {
            await this.connect();
        }

        let hasMore = true;
        const batchSize = this.config.limit || 100;

        // Build the initial query
        let query: Query<DocumentData> = this.db!.collection(this.config.collection);

        // Apply where conditions
        if (this.config.where) {
            for (const [field, op, value] of this.config.where) {
                query = query.where(field, op, value);
            }
        }

        // Apply order by conditions (required for cursors)
        if (this.config.orderBy) {
            for (const [field, direction] of this.config.orderBy) {
                query = query.orderBy(field, direction);
            }
        }

        // Apply initial cursor position if specified
        if (this.config.startAt) {
            query = query.startAt(...this.config.startAt);
        } else if (this.config.startAfter) {
            query = query.startAfter(...this.config.startAfter);
        }

        // Apply end position if specified
        if (this.config.endBefore) {
            query = query.endBefore(...this.config.endBefore);
        } else if (this.config.endAt) {
            query = query.endAt(...this.config.endAt);
        }

        // Apply limit
        query = query.limit(batchSize);

        while (hasMore) {
            // Execute query
            const snapshot = await query.get();
            const docs = snapshot.docs;

            if (!docs || docs.length === 0) {
                hasMore = false;
                break;
            }

            // Transform documents to plain objects
            const batch = docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));

            // Store the last document for next batch
            this.lastDocumentSnapshot = docs[docs.length - 1];

            yield batch;

            // Check if we have more documents to fetch
            if (docs.length === batchSize) {
                // Update query to start after the last document
                query = query.startAfter(this.lastDocumentSnapshot);
            } else {
                hasMore = false;
            }
        }
    }

    /**
     * Cleanly terminates the Firestore connection and resets internal state.
     * This method should be called when done with the driver to free up resources
     * and ensure proper cleanup.
     *
     * The method:
     * - Terminates the Firestore connection if active
     * - Clears the database instance reference
     * - Resets the pagination state
     */
    async close(): Promise<void> {
        if (this.db) {
            await this.db.terminate();
            this.db = null;
        }
        this.lastDocumentSnapshot = null;
    }
}

export { FirestoreConfig } from './type';