import { Injectable } from '@angular/core';
import { ActivatedRoute, Params } from '@angular/router';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { BehaviorSubject, Subject } from 'rxjs';

import { NxCloudApiService } from '@services/nx-cloud-api';
import { ReadOnlyAPI } from '@services/nx-cloud-api/nx-cloud-api.types';
import { NxConfigService } from '@services/nx-config/nx-config.service';
import { isUUID } from '@utils/general';

import { createMenuContent, prepareSwaggerAPIDoc, removeProprietaryEndpoints } from '../api-file-utils';

import type { EmitInfo, Store, ReadOnlyAPIStore } from './api-tool-service-types';

@UntilDestroy()
@Injectable()
export class NxReadonlyAPIService {
    isEnabled = true;
    currentReadonlyAPI$ = new BehaviorSubject<ReadOnlyAPIStore>(null);
    readonlyAPIEmitter$ = new Subject<EmitInfo<ReadOnlyAPI>>();
    emitReadOnlyAPI(info: ReadOnlyAPI, disabled = false, error = ''): void {
        this.readonlyAPIEmitter$.next({ info, disabled, error });
    }

    readonlyAPIStore: Store<ReadOnlyAPIStore> = {};

    get currentReadonlyAPI() { return this.currentReadonlyAPI$.value; }
    set currentReadonlyAPI(api: ReadOnlyAPIStore) { this.currentReadonlyAPI$.next(api); }

    queryParams: Params;

    constructor(
        private configService: NxConfigService,
        private api: NxCloudApiService,
                private _route: ActivatedRoute) {
        this.isEnabled = this.configService.flagsEnabled('readonlyAPIs');
        this._route.queryParams.pipe(untilDestroyed(this)).subscribe(params => {
            this.queryParams = params;
        });
    }

    async getReadonlyAPIs(): Promise<void> {
        if (!this.isEnabled) return;

        const readonlyAPIs = await this.api.getReadOnlyAPIs().toPromise();
        for (const API of readonlyAPIs.data) {
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
            let openapiJSON = readonlyAPI.files.find(item => item.type === 'Main JSON')?.content as any;
            if (openapiJSON) {
                try {
                    openapiJSON = JSON.parse(openapiJSON);
                    removeProprietaryEndpoints(openapiJSON);
                    prepareSwaggerAPIDoc(openapiJSON, 'main');
                } catch (error) { // Invalid format, don't add to dropdown
                    console.log(error);
                    return false;
                }
            } else {
                return false;
            }
            const menu = createMenuContent(openapiJSON);
            const apiStoreObject = { ...readonlyAPI, content: openapiJSON };
            this.readonlyAPIStore[readonlyAPI.id] = {
                api: apiStoreObject,
                menu
            };
            this.currentReadonlyAPI = this.readonlyAPIStore[readonlyAPI.id];
            return true;
        }
        return false;
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

    setReadonlyAPI(id: number = null) {
        if (!this.isEnabled) return;

        if (id) {
            this.currentReadonlyAPI = this.readonlyAPIStore[id];
            return true;
        }
        const firstReadonlyAPIKey = Object.keys(this.readonlyAPIStore)[0];
        if (firstReadonlyAPIKey) {
            // Set to any readonlyAPI
            this.currentReadonlyAPI = this.readonlyAPIStore[parseInt(firstReadonlyAPIKey)];
            return true;
        }

        return false;
    }
}
