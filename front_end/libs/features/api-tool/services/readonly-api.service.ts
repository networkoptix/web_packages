import { Injectable } from '@angular/core';
import { ActivatedRoute, Params } from '@angular/router';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { cloneDeep } from 'lodash-es';
import { firstValueFrom, BehaviorSubject, Subject } from 'rxjs';

import { MenuNodeWithParent } from '@components/developers-menu/developers-menu-types';
import { NxCloudApiService } from '@services/nx-cloud-api';
import { ReadOnlyAPI, ReadOnlyAPIDetail } from '@services/nx-cloud-api/nx-cloud-api.types';
import { FeatureFlagStrings, LegacyMenuManifest } from '@services/nx-config/base-config';
import { nxConfig } from '@services/nx-config/config';
import { apiTool } from '@static-variables';
import { isUUID } from '@utils/general';

import {
    addAPIInfoNodesToMenu,
    mergeAPIDocs,
    prepareSwaggerAPIDoc,
    addSeperator,
    generateMenu,
} from '../api-file-utils';
import { APIDoc } from '../api-tool-types';

import type { EmitInfo, Store, ReadOnlyAPIStore, MarkdownIndex } from './api-tool-service-types';

@UntilDestroy()
@Injectable()
export class NxReadonlyAPIService {
    isEnabled = !!nxConfig.featureFlags[FeatureFlagStrings.readonlyAPIs];
    currentReadonlyAPI$ = new BehaviorSubject<ReadOnlyAPIStore>(null);
    readonlyAPIEmitter$ = new Subject<EmitInfo<ReadOnlyAPI>>();
    emitReadOnlyAPI(info: ReadOnlyAPI, disabled = false, error = ''): void {
        this.readonlyAPIEmitter$.next({ info, disabled, error });
    }

    readonlyAPIStore: Store<ReadOnlyAPIStore> = {};
    readonlyAPIIDs: number[] = []; // Used only to get the first readonlyAPI if none is specified

    get currentReadonlyAPI() {
        return this.currentReadonlyAPI$.value;
    }
    set currentReadonlyAPI(api: ReadOnlyAPIStore) {
        this.currentReadonlyAPI$.next(api);
    }

    queryParams: Params;

    constructor(
        private api: NxCloudApiService,
        private _route: ActivatedRoute,
    ) {
        this._route.queryParams.pipe(untilDestroyed(this)).subscribe(params => {
            this.queryParams = params;
        });
    }

    async getReadonlyAPIs(): Promise<void> {
        if (!this.isEnabled) {
            return;
        }

        const readonlyAPIs = await this.api.getReadOnlyAPIs().toPromise();
        if (readonlyAPIs?.data) {
            readonlyAPIs.data.sort((a, b) => a.order - b.order);
            for (const API of readonlyAPIs.data) {
                this.readonlyAPIIDs.push(API.id);
                this.emitReadOnlyAPI(API, !API.enabled);
            }
        }
    }

    async getReadonlyAPI(id: number) {
        if (!this.isEnabled) {
            return false;
        }

        if (this.readonlyAPIStore[id]) {
            this.currentReadonlyAPI = this.readonlyAPIStore[id];
            return true;
        }
        const readonlyAPI = await firstValueFrom(this.api.getReadOnlyAPI(id));
        if (readonlyAPI) {
            const manifest = JSON.parse(readonlyAPI.manifest);
            let APIInformation, APIChangelog;
            for (const file of readonlyAPI.files) {
                switch (file.type) {
                    case 'Preamble Markdown File':
                        APIInformation = file.content;
                        break;
                    case 'Changelog Markdown File':
                        APIChangelog = file.content;
                        break;
                    default:
                        break;
                }
            }
            let markdown: MarkdownIndex | undefined;
            if (APIInformation || APIChangelog) {
                markdown = {
                    APIInformation,
                    APIChangelog,
                };
            }
            const preparedReadOnlyAPI = this.prepareReadonlyAPI(manifest, readonlyAPI, markdown);

            if (preparedReadOnlyAPI) {
                const apiStoreObject = { ...readonlyAPI, content: preparedReadOnlyAPI.json };
                this.readonlyAPIStore[readonlyAPI.id] = {
                    api: apiStoreObject,
                    menus: preparedReadOnlyAPI.menus,
                    markdown,
                };
                this.currentReadonlyAPI = this.readonlyAPIStore[readonlyAPI.id];
                return true;
            }
        }
        return false;
    }

    prepareReadonlyAPI(
        manifest: LegacyMenuManifest,
        readonlyAPI: ReadOnlyAPIDetail,
        markdown: MarkdownIndex | undefined = undefined,
    ) {
        let combinedJSON: APIDoc = {} as APIDoc;
        let combinedJSONCreated = false;
        const menus = {};
        for (let i = 0; i < manifest.length; i++) {
            const item = manifest[i];
            const type = i + 1;
            const menu: MenuNodeWithParent[] = [];
            for (const section of item.sections) {
                if (section.name) {
                    addSeperator(menu, section.name);
                }
                const json: APIDoc = JSON.parse(
                    cloneDeep(
                        readonlyAPI.files.find(file => file.filename === section.scheme)
                            .content as string,
                    ),
                );
                prepareSwaggerAPIDoc(json, type);
                if (!combinedJSONCreated) {
                    combinedJSONCreated = true;
                    combinedJSON = json;
                } else {
                    mergeAPIDocs(combinedJSON, json);
                }
                generateMenu(menu, json);
                menus[i + 1] = menu;
            }
            if (markdown) {
                addAPIInfoNodesToMenu(apiTool.defaultDocs, menu, markdown);
            }
        }
        return {
            json: combinedJSON,
            menus,
        };
    }

    async getReadonlyAPIByQueryParams() {
        if (!this.isEnabled) {
            return false;
        }

        const systemParam = this.queryParams.system;
        if (systemParam && !isUUID(systemParam)) {
            const readonlyAPIId = parseInt(systemParam);
            const readonlyAPI = this.readonlyAPIStore[readonlyAPIId];
            if (!readonlyAPI) {
                return this.getReadonlyAPI(readonlyAPIId);
            }
            if (readonlyAPI) {
                this.currentReadonlyAPI = readonlyAPI;
                return true;
            }
        }
        return false;
    }

    async setReadonlyAPI(id: number | undefined = undefined) {
        if (!this.isEnabled) {
            return false;
        }

        if (id) {
            return this.getReadonlyAPI(id);
        }
        const firstReadonlyAPIKey = this.readonlyAPIIDs[0];
        if (firstReadonlyAPIKey) {
            // Set to any readonlyAPI
            return this.getReadonlyAPI(firstReadonlyAPIKey);
        }

        return false;
    }
}
