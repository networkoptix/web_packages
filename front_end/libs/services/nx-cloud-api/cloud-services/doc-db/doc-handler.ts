import { Observable, catchError, map } from 'rxjs';
import { v4 as uuid } from 'uuid';

import { cleanId } from '@utils/general';

import { BaseCloudServiceAPI } from '../base-cloud-service-api';

import { DocId } from './doc-db-api.types';

/**
 * Handler for working with docDb documents.
 *
 * The class constructor accepts the DocDbAPI as the first argument and the prefix
 * tied to directory as the second argument.
 */
export class DocHandler<DocType extends DocId> {
    prefix: string;

    constructor(private api: BaseCloudServiceAPI, prefix: string, postFixContents = true) {
        this.prefix = postFixContents ? `${prefix}/contents` : prefix;
    }

    /**
     * Get a list of documents.
     *
     * @returns Observable<DocType[]>
     */
    list(): Observable<DocType[]> {
        return this.api
            .get<{ key: string; contents: DocType }[]>(`${this.prefix}?matchPrefix`)
            .pipe(
                map(res =>
                    res.map(({ key: docId, contents }) => ({
                        docId,
                        ...contents,
                    })),
                ),
            );
    }

    /**
     * Retreives a particular document.
     *
     * @param docId UUID
     * @returns Observable<DocType>
     */
    retrieve(docId: string): Observable<DocType> {
        return this.api
            .get<DocType>(`${this.prefix}/${docId}`)
            .pipe(map(doc => ({ docId, ...doc })));
    }

    /**
     * Wrapper that first tries to update a document, if the document doesn't exist then it creates it.
     *
     * @param doc DocType
     */
    save(doc: DocType): Observable<DocType>;
    /**
     * Wrapper that first tries to update a document, if the document doesn't exist then it creates it.
     * The docId is passed as the first argument and the doc as the second argument.
     *
     * Used for cases where we for some reason wanted to remove the docId field from the doc.
     *
     * @param doc DocType
     */
    save(docId: string, doc: DocType): Observable<DocType>;
    save(docIdOrDoc: string | DocType, doc?: DocType): Observable<DocType> {
        const { body } = this.normalizeFromOverloads(docIdOrDoc, doc);
        return this.update(body).pipe(catchError(() => this.create(body)));
    }

    /**
     * Create a new document.
     *
     * @param doc DocType
     */
    create(doc: DocId): Observable<DocType>;
    /**
     * Create a new document. The docId is passed as the first argument
     * and the doc as the second argument.
     *
     * Used for cases where we for some reason wanted to remove the docId field from the doc.
     *
     * @param doc DocType
     */
    create(docId: string, doc: DocId): Observable<DocType>;
    create(docIdOrDoc: string | DocId, doc?: DocType): Observable<DocType> {
        return this.api.post<DocType>(...this.generateSavePayload(docIdOrDoc, doc));
    }

    /**
     * Updated an existing document.
     *
     * @param doc DocType
     */
    update(doc: DocType): Observable<DocType>;
    /**
     * Updated an existing document. The docId is passed as the first argument
     * and the doc as the second argument.
     *
     * Used for cases where we for some reason wanted to remove the docId field from the doc.
     *
     * @param doc DocType
     */
    update(docId: string, doc: DocId): Observable<DocType>;
    update(docIdOrDoc: string | DocId, doc?: DocType): Observable<DocType> {
        return this.api.put<DocType>(...this.generateSavePayload(docIdOrDoc, doc));
    }

    /**
     * Deletes a particular document.
     *
     * @param docId UUID
     */
    delete(docId: string): Observable<unknown>;
    delete(docId: DocType): Observable<unknown>;
    delete(docIdOrDoc: string | DocType): Observable<unknown> {
        const docId = typeof docIdOrDoc === 'string' ? docIdOrDoc : docIdOrDoc.id;
        return this.api.delete<Record<string, never>>(`${this.prefix}/${cleanId(docId)}`);
    }

    /**
     * Helper method to normalize the payload from method overloads.
     *
     * @param docIdOrDoc string | DocType
     * @param doc DocType
     * @returns [string, { body: DocType }]
     */
    private generateSavePayload(
        docIdOrDoc: string | (DocId & Partial<Pick<DocType, 'id'>>),
        doc?: DocType,
    ): [string, { body: DocType }] {
        const { docId, body } = this.normalizeFromOverloads(docIdOrDoc, doc);
        return [docId, { body }];
    }

    /**
     * Helper method to normalize the payload from method overloads.
     */
    private normalizeFromOverloads(
        docIdOrDoc: string | (DocId & Partial<Pick<DocType, 'id'>>),
        doc: DocType,
    ): { docId: string; body: DocType } {
        const isDocId = typeof docIdOrDoc === 'string';
        const id = isDocId ? docIdOrDoc : docIdOrDoc.id || uuid();
        const docId = `${this.prefix}/${cleanId(id)}`;
        const body = { ...(isDocId ? doc : docIdOrDoc), id, docId } as DocType;
        return { docId, body };
    }
}
