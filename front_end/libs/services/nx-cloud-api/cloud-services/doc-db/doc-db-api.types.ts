export interface DocId {
    docId: string;
}

/**
 * TODO:
 *
 * We need to figure out where to put these interfaces.
 *
 * Keeping them here might cause ciclic dependencies.
 */

interface SomeExampleModel {}

/**
 * The types used with docDB should extend DocId and the interface for the
 * underlying model.
 */

export interface CrossSystemLayout extends DocId, SomeExampleModel {}

export interface CachedLayout extends DocId, SomeExampleModel {}
