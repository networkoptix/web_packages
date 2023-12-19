import { inject } from '@angular/core';
import { Observable, catchError, from, map, switchMap } from 'rxjs';
import { v4 as uuid } from 'uuid';

import { NxCloudApiService } from '@services/nx-cloud-api/nx-cloud-api';
import { cleanIdLegacy } from '@utils/general';
import { sha256 } from '@utils/sha256';

import { BaseCloudServiceAPI } from '../base-cloud-service-api';

import { DocId } from './doc-db-api.types';

/**
 * Handler for working with docDb documents.
 *
 * The class constructor accepts the DocDbAPI as the first argument and the prefix
 * tied to directory as the second argument.
 */
export class DocHandler<DocType extends DocId> {
    static runInInjectionContext: <T>(callback: () => T) => T;

    prefix: string;

    constructor(
        private api: BaseCloudServiceAPI,
        prefix: string,
        postFixContents = true,
        private nameSpaceForUser = true,
    ) {
        this.prefix = postFixContents ? `${prefix}/contents` : prefix;
    }

    private async getNameSpacedPrefix(): Promise<string> {
        if (this.nameSpaceForUser) {
            const cloudApi = DocHandler.runInInjectionContext(() => inject(NxCloudApiService));
            const shaEmail = await sha256(cloudApi.currentAccount.email);
            return `${shaEmail}/${this.prefix}`;
        }

        return this.prefix;
    }

    private withPrefix<Handler extends (prefix: string) => Observable<U>, U>(
        handler: Handler,
    ): Observable<U> {
        return from(this.getNameSpacedPrefix()).pipe(switchMap(prefix => handler(prefix)));
    }

    /**
     * Get a list of documents.
     *
     * @returns Observable<DocType[]>
     */
    list(): Observable<DocType[]> {
        return this.withPrefix(prefix =>
            this.api.get<{ key: string; contents: DocType }[]>(`${prefix}?matchPrefix`).pipe(
                map(res =>
                    res.map(({ key: docId, contents }) => ({
                        docId,
                        ...contents,
                    })),
                ),
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
        return this.withPrefix(prefix =>
            this.api.get<DocType>(`${prefix}/${docId}`).pipe(map(doc => ({ docId, ...doc }))),
        );
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
        return this.withPrefix(prefix =>
            this.api.post<DocType>(...this.generateSavePayload(docIdOrDoc, doc, prefix)),
        );
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
        return this.withPrefix(prefix =>
            this.api.put<DocType>(...this.generateSavePayload(docIdOrDoc, doc, prefix)),
        );
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
        return this.withPrefix(prefix => this.api.delete(`${prefix}/${cleanIdLegacy(docId)}`));
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
        prefix?: string,
    ): [string, { body: DocType }] {
        const { docId, body } = this.normalizeFromOverloads(docIdOrDoc, doc, prefix);
        return [docId, { body }];
    }

    /**
     * Helper method to normalize the payload from method overloads.
     */
    private normalizeFromOverloads(
        docIdOrDoc: string | (DocId & Partial<Pick<DocType, 'id'>>),
        doc: DocType,
        prefix: string = '',
    ): { docId: string; body: DocType } {
        const isDocId = typeof docIdOrDoc === 'string';
        const docIdKey = isDocId ? docIdOrDoc : docIdOrDoc.docId || docIdOrDoc.id || uuid();
        const id = isDocId ? docIdOrDoc : docIdOrDoc.id || docIdOrDoc.docId || uuid();
        const docId = prefix ? `${prefix}/${cleanIdLegacy(docIdKey)}` : cleanIdLegacy(docIdKey);
        const body = { ...(isDocId ? doc : docIdOrDoc), id, docId } as DocType;
        return { docId, body };
    }
}
