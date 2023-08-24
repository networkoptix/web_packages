import { HttpClient } from '@angular/common/http';

import { UnsavedLayoutState } from '@services/layout-state/store/shared/types/layout-state.types';

import { WithFreshSession } from '../../nx-cloud-api.types';
import {
    BaseCloudServiceAPI,
    CreateApiFactory,
    implementsCloudServiceApi,
} from '../base-cloud-service-api';

import { CrossSystemLayout, DocId } from './doc-db-api.types';
import { DocDirectory } from './doc-directory';

/**
 * API for working with docDb documents.
 *
 * Handlers are registered by initializing a new DocDirectory. To initialize a
 * child directory call the getChildDocDirectory method. to initialize a DocHandler
 * to allow saving and retrieving documents call the getDocHandler method.
 *
 * ```typescript
 * crossSystemLayout = new DocDirectory<CrossSystemLayout>(this, 'layouts').getDocHandler();
 * ```
 *
 * Some caveats with docDB is that it collects all documents with the same prefix.
 * Sub directories will be included when filtering by the parent prefix.
 *
 * That's the main reason for splitting the DocDirectory and DocHandler classes.
 * It prevents accidentally saving/retrieving documents in a parent folder and
 * child folders while expecting them to be separate.
 *
 * See https://networkoptix.atlassian.net/wiki/spaces/PM/pages/2694250499/JSON+document+storage for documentation
 */
@implementsCloudServiceApi
export class DocDbAPI extends BaseCloudServiceAPI {
    /**  Register doc handlers here. */

    /**
     * Handler for working with cross system layouts.
     *
     * All cross system layouts are stored in a the same directory so we're initializing
     * with a DocHandler.
     */
    crossSystemLayout = new DocDirectory<CrossSystemLayout>(this, 'layouts').getDocHandler(false);

    /**
     * Handler for working with cached layouts.
     *
     * Cached layouts are used to store intermediate data for layouts that are
     * not set persisted into either the mediaserver for local layouts or docDb
     * for cross system layouts.
     *
     * Cached layouts are stored in separate directories by system so we're
     * initializing with a DocDirectory.
     *
     * Cross system layouts aren't system specific so they could be stored in the
     * root directory by calling getDocHandler instead of getChildDocDirectory.
     */
    unsavedLayouts = new DocDirectory<UnsavedLayoutState>(this, 'unsavedLayouts');

    /**
     * Sandbox for experiementing with docDb.
     */
    sandbox = new DocDirectory<Record<string, unknown> & DocId>(this, 'sandbox');

    /**
     * Api base DocDbAPI.
     */
    static readonly API_BASE = '/docdb/v1/docs/';

    static INSTANCES: Record<string, DocDbAPI> = {};

    /**
     * Create's a factory for instancating a DocDbAPI.
     *
     * @param config IConfig
     * @param http HttpClient
     * @param withFreshSession WithFreshSession
     * @returns (serverUrl?: string, cloudHost?: string) => CloudDbAPI
     */
    static createApiFactory: CreateApiFactory<DocDbAPI> =
        (http: HttpClient, withFreshSession: WithFreshSession) =>
        (serverUrl: string = '', hostOrCustomization: () => string = () => '') => {
            DocDbAPI.INSTANCES[serverUrl] ||= new DocDbAPI(
                serverUrl,
                hostOrCustomization,
                http,
                withFreshSession,
            );
            return DocDbAPI.INSTANCES[serverUrl];
        };

    constructor(
        serverUrl: string,
        hostOrCustomization: () => string,
        http: HttpClient,
        withFreshSession: WithFreshSession,
    ) {
        super(serverUrl, DocDbAPI.API_BASE, hostOrCustomization, http, withFreshSession);
    }
}
