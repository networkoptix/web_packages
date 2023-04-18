
import type { HttpClient } from '@angular/common/http';
import { v4 as uuid } from 'uuid';

import { apiBase } from '@lib/variables/static-variables';
import type { NxConsoleService } from '@pages/developer-console/console/console.service';

import type * as t from './nx-cloud-api.types';

export class CustomClientAPI {
    private readonly apiBase: string;

    constructor(private http: HttpClient, private consoleService: NxConsoleService) {
        this.apiBase = apiBase + '/cms/custom_clients/';
    }

    create = (name: string, baseVms?, values: Record<string, string> = {}) => {
        if (!Object.keys(values).length) {
            const id = uuid();
            this.consoleService.unsavedAssets[id] = { name, base_vms: baseVms, id, unsaved: true, values: {} };
            return Promise.reject(id);
        }
        const body: any = { name };
        if (Object.entries(values).length) {
            body.values = values;
        }

        if (baseVms) {
            body.base_vms = baseVms;
        }
        return this.http.post<t.CustomClient>(this.apiBase, body);
    };

    retrieve = id => {
        return this.http.get<t.CustomClient>(`${this.apiBase}${id}/`);
    };

    list = () => {
        return this.http.get<t.CustomClient[]>(this.apiBase);
    };

    update = (id, name, values) => {
        return this.http.put<t.CustomClient>(`${this.apiBase}${id}/`, { name, values });
    };

    partialUpdate = (id, name?, data: Record<string, any> = {}, values: Record<string, any> = {}) => {
        if (name !== undefined) {
            data.name = name;
        }
        data.values = { ...(data.values || {}), ...values };
        return this.http.patch<t.CustomClient>(`${this.apiBase}${id}/`, data);
    };

    destroy = id => {
        return this.http.delete(`${this.apiBase}${id}/`);
    };

    getManifest = () => {
        return this.http.get<t.ContentManifest>(`${this.apiBase}get_manifest/`);
    };

    generatePackage = (id: string) => {
        return this.http.post<{ downloadId: string }>(`${this.apiBase}${id}/generate_package/`, {});
    };

    checkPackage = (id: string, downloadId: string) => {
        return this.http.get<t.PackageStatus>(`${this.apiBase}${id}/check_package/?downloadId=${downloadId}`);
    };

    getDownloadUrl = (id: string, downloadId: string) => `${this.apiBase}${id}/download_package/?downloadId=${downloadId}`;
}
