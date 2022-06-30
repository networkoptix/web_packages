import { Injectable } from '@angular/core';
import { ActivatedRoute, Params } from '@angular/router';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { BehaviorSubject, Subject } from 'rxjs';

import { NxCloudApiService } from '@services/nx-cloud-api';
import { ReadOnlyAPI } from '@services/nx-cloud-api/nx-cloud-api.types';
import { APIDocType, FeatureFlagStrings } from '@services/nx-config/base-config';
import { IConfig } from '@services/nx-config/config-types';
import { NxConfigService } from '@services/nx-config/nx-config.service';
import { isUUID } from '@utils/general';

import { addAPIInfoNodesToMenu, addSeperatedAPIMenu, createMenuContent, mergeAPIDocs, prepareSwaggerAPIDoc, cleanJSON } from '../api-file-utils';
import { APIDoc } from '../api-tool-types';

import type { EmitInfo, Store, ReadOnlyAPIStore, Markdown } from './api-tool-service-types';

@UntilDestroy()
@Injectable()
export class NxReadonlyAPIService {
    CONFIG: IConfig;
    isEnabled = true;
    currentReadonlyAPI$ = new BehaviorSubject<ReadOnlyAPIStore>(null);
    readonlyAPIEmitter$ = new Subject<EmitInfo<ReadOnlyAPI>>();
    emitReadOnlyAPI(info: ReadOnlyAPI, disabled = false, error = ''): void {
        this.readonlyAPIEmitter$.next({ info, disabled, error });
    }

    readonlyAPIStore: Store<ReadOnlyAPIStore> = {};
    readonlyAPIIDs: number[] = []; // Used only to get the first readonlyAPI if none is specified

    get currentReadonlyAPI() { return this.currentReadonlyAPI$.value; }
    set currentReadonlyAPI(api: ReadOnlyAPIStore) { this.currentReadonlyAPI$.next(api); }

    queryParams: Params;

    constructor(
        private configService: NxConfigService,
        private api: NxCloudApiService,
                private _route: ActivatedRoute) {
        this.CONFIG = this.configService.getConfig();
        this.isEnabled = this.configService.flagsEnabled(FeatureFlagStrings.readonlyAPIs);
        this._route.queryParams.pipe(untilDestroyed(this)).subscribe(params => {
            this.queryParams = params;
        });
    }

    async getReadonlyAPIs(): Promise<void> {
        if (!this.isEnabled) return;

        const readonlyAPIs = await this.api.getReadOnlyAPIs().toPromise();
        for (const API of readonlyAPIs.data) {
            this.readonlyAPIIDs.push(API.id);
            this.emitReadOnlyAPI(API, !API.enabled);
        }
    }

    async getReadonlyAPI(id: number) {
        if (!this.isEnabled) return false;

        if (this.readonlyAPIStore[id]) {
            this.currentReadonlyAPI = this.readonlyAPIStore[id];
            return true;
        }
        const readonlyAPI = await this.api.getReadOnlyAPI(id).toPromise();
        if (readonlyAPI) {
            let openapiJSON, legacyJSON, deprecatedJSON, APIPreamble, APIChangelog;
            for (const file of readonlyAPI.files) {
                switch (file.type) {
                    case 'Main JSON':
                        openapiJSON = file.content;
                        break;
                    case 'Legacy JSON':
                        legacyJSON = file.content;
                        break;
                    case 'Deprecated JSON':
                        deprecatedJSON = file.content;
                        break;
                    case 'Preamble Markdown File':
                        APIPreamble = file.content;
                        break;
                    case 'Changelog Markdown File':
                        APIChangelog = file.content;
                        break;
                    default:
                        break;
                }
            }
            const preparedReadOnlyAPI = this.prepareReadonlyAPI(openapiJSON, legacyJSON, deprecatedJSON, !!(APIPreamble && APIChangelog));
            let markdown: Markdown;
            if (APIPreamble && APIChangelog) {
                markdown = {
                    APIPreamble,
                    APIChangelog
                };
            }
            if (preparedReadOnlyAPI) {
                const apiStoreObject = { ...readonlyAPI, content: preparedReadOnlyAPI.json };
                this.readonlyAPIStore[readonlyAPI.id] = {
                    api: apiStoreObject,
                    menus: preparedReadOnlyAPI.menus,
                    markdown
                };
                this.currentReadonlyAPI = this.readonlyAPIStore[readonlyAPI.id];
                return true;
            }
        }
        return false;
    }

    prepareReadonlyAPI(main: string, legacy: string, deprecated: string, hasMarkdown: boolean) {
        const apiTypes = this.CONFIG.apiTool.apiTypes;
        let mainJSON: APIDoc;
        const menus = {};
        try {
            mainJSON = JSON.parse(main);
            cleanJSON(mainJSON);
            prepareSwaggerAPIDoc(mainJSON, 'main');
        } catch (error) { // Invalid format, don't add to dropdown
            console.error(error);
            return false;
        }
        const mainMenu = createMenuContent(mainJSON);
        if (legacy) {
            try {
                const legacyJSON = JSON.parse(legacy);
                prepareSwaggerAPIDoc(legacyJSON, 'legacy');
                mergeAPIDocs(mainJSON, legacyJSON);
                addSeperatedAPIMenu(legacyJSON, mainMenu, 'LEGACY');
            } catch (error) {
                // Dont handle legacy JSON
            }
        }
        addAPIInfoNodesToMenu(mainJSON, mainMenu, hasMarkdown);
        menus[apiTypes.main.type] = mainMenu;
        if (deprecated) {
            const deprecatedJSON: APIDoc = JSON.parse(deprecated);
            prepareSwaggerAPIDoc(deprecatedJSON, apiTypes.deprecated.type as APIDocType);
            mergeAPIDocs(mainJSON, deprecatedJSON);
            const deprecatedMenu = createMenuContent(deprecatedJSON, hasMarkdown ? 'LEGACY' : '');
            addAPIInfoNodesToMenu(deprecatedJSON, deprecatedMenu, hasMarkdown);
            menus[apiTypes.deprecated.type] = deprecatedMenu;
        }
        return {
            json: mainJSON,
            menus
        };
    }

    async getReadonlyAPIByQueryParams() {
        if (!this.isEnabled) return false;

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

    async setReadonlyAPI(id: number = null) {
        if (!this.isEnabled) return false;

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
