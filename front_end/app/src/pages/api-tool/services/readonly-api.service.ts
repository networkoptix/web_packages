import { Injectable } from '@angular/core';
import { ActivatedRoute, Params } from '@angular/router';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { BehaviorSubject, Subject } from 'rxjs';

import { NxCloudApiService } from '@services/nx-cloud-api';
import { OpenAPIJSON } from '@services/nx-cloud-api.types';
import { NxConfigService } from '@services/nx-config/nx-config.service';
import { isUUID } from '@utils/general';

import { createMenuContent, prepareSwaggerAPIDoc, removeProprietaryEndpoints } from '../api-file-utils';

import type { EmitInfo, Store, ReadonlyAPI } from './api-tool-service-types';

@UntilDestroy()
@Injectable()
export class NxReadonlyAPIService {
    isEnabled = true;
    currentReadonlyAPI$ = new BehaviorSubject<ReadonlyAPI>(null);
    readonlyAPIEmitter$ = new Subject<EmitInfo<OpenAPIJSON>>();
    emitReadOnlyAPI(info: OpenAPIJSON, disabled = false, error = '') {
        this.readonlyAPIEmitter$.next({ info, disabled, error });
    }

    readonlyAPIStore: Store<ReadonlyAPI> = {};

    get currentReadonlyAPI() { return this.currentReadonlyAPI$.value; }
    set currentReadonlyAPI(api: ReadonlyAPI) { this.currentReadonlyAPI$.next(api); }

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

    async getReadonlyAPIs() {
        if (!this.isEnabled) return;

        const readOnlyJSONs = await this.api.getOpenAPIJSONs().toPromise();
        for (const API of readOnlyJSONs.data) {
            try {
                removeProprietaryEndpoints(API.content);
                prepareSwaggerAPIDoc(API.content, 'main');
            } catch (error) { // Invalid format, don't add to dropdown
                continue;
            }
            this.emitReadOnlyAPI(API);
            const menu = createMenuContent(API.content);
            this.readonlyAPIStore[API.id] = {
                api: API,
                menu
            };
        }
    }

    getReadonlyAPIByQueryParams = () => {
        if (!this.isEnabled) return;

        const systemParam = this.queryParams.system;
        if (systemParam && !isUUID(systemParam)) {
            const readonlyAPI = this.readonlyAPIStore[parseInt(systemParam)];
            if (readonlyAPI) {
                this.currentReadonlyAPI = readonlyAPI;
                return true;
            }
        }
        return false;
    };

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
