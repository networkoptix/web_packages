import { Component, Inject, Input, LOCALE_ID, OnChanges } from '@angular/core';
import { LocalStorageService } from 'ngx-webstorage';

import type { IConfig } from '@services/nx-config/config-types';
import { NxConfigService } from '@services/nx-config/nx-config.service';
import { icons } from '@static-variables';
import { alphabeticalSort } from '@utils/general';
import { NgChanges } from '@utils/ng-changes';

import { ViewCamera } from '../../datatypes/Camera';
import type { ViewMediaServer } from '../../datatypes/IMediaServer';

@Component({
    selector: 'nx-media-server-list',
    templateUrl: 'media-server-list.component.html',
    styleUrls: ['media-server-list.component.scss'],
})
export class MediaServerListComponent implements OnChanges {
    @Input('mediaservers') _mediaservers: Array<ViewMediaServer> = [];
    @Input() selectedCameraId: string;
    @Input() systemId: string;

    CONFIG: IConfig;
    icons = icons;

    showIP: boolean = false;
    token: string = '';

    mediaservers: Array<ViewMediaServer>;
    private processedMediaservers: Array<ViewMediaServer>;

    previewLoaded: Record<string, true | -1> = {};
    isCameraVisible: { [key: string]: boolean } = {};

    handlePreviewLoaded(cid: string): void {
        this.previewLoaded[cid] = true;
    }

    handlePreviewError(cid: string): void {
        this.previewLoaded[cid] = -1;
    }

    isServerExpanded: {
        [serverId: string]: boolean;
    } = {};

    constructor(
        private localStorage: LocalStorageService,
        configService: NxConfigService,
        @Inject(LOCALE_ID) private locale: string,
    ) {
        this.CONFIG = configService.config;
    }

    ngOnChanges(changes: NgChanges<MediaServerListComponent>): void {
        if (changes._mediaservers?.previousValue !== changes._mediaservers?.currentValue) {
            this.previewLoaded = {};
            this.processedMediaservers = this._mediaservers || [];
            this.processedMediaservers.sort(alphabeticalSort(this.locale, ms => ms.name));
            this.processedMediaservers.forEach(ms => {
                ms.cameras.sort(alphabeticalSort(this.locale, cam => cam.name));
            });
        }

        // Reset server visibility
        if (this.processedMediaservers) {
            this.isServerExpanded = this.processedMediaservers.reduce((acc, ms) => {
                const key = `nx_system_${this.systemId}_server_${ms.id}_expansion_status`;
                const status = this.localStorage.retrieve(key);
                acc[ms.id] = status ? JSON.parse(status) : false;
                return acc;
            }, {});
        } else {
            this.isServerExpanded = {};
        }

        this.updateFilteredList(this.token);
    }

    changeServerVisibility(serverId: string): void {
        this.isServerExpanded[serverId] = !this.isServerExpanded[serverId];
        const key = `nx_system_${this.systemId}_server_${serverId}_expansion_status`;
        this.localStorage.store(key, JSON.stringify(this.isServerExpanded[serverId]));
    }

    updateShowIP(newValue: boolean): void {
        this.showIP = newValue;
    }

    updateFilteredList(token: string): void {
        this.token = token;
        if (!token) {
            this.mediaservers = this.processedMediaservers;
            return;
        }
        token = token.toLocaleLowerCase();
        this.mediaservers = this.processedMediaservers.reduce<ViewMediaServer[]>((acc, ms) => {
            const cameras = ms.cameras.filter(
                c =>
                    c.name.toLocaleLowerCase().includes(token) ||
                    c.url.toLocaleLowerCase().includes(token),
            );
            if (
                cameras.length ||
                ms.name.toLocaleLowerCase().includes(token) ||
                ms.ip.toLocaleLowerCase().includes(token)
            ) {
                acc.push({ ...ms, cameras });
            }
            return acc;
        }, []);
    }

    cameraId(index: number, camera: ViewCamera): string {
        return camera ? camera.id : undefined;
    }

    serverID(index: number, server: ViewMediaServer): string {
        return server ? server.id : undefined;
    }
}
