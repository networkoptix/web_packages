import { Component, Inject, Input, LOCALE_ID, OnChanges } from '@angular/core';
import { LocalStorageService } from 'ngx-webstorage';

import { icons } from '@lib/variables/static-variables';
import type { IConfig } from '@services/nx-config/config-types';
import { NxConfigService } from '@services/nx-config/nx-config.service';
import { alphabeticalSort } from '@utils/general';
import { NgChanges } from '@utils/ng-changes';

import { MediaServer } from '../../datatypes/MediaServer';

@Component({
    selector: 'nx-media-server-list',
    templateUrl: 'media-server-list.component.html',
    styleUrls: ['media-server-list.component.scss'],
})
export class MediaServerListComponent implements OnChanges {
    @Input('mediaservers') _mediaservers: Array<MediaServer> = [];
    @Input() selectedCameraId: string;
    @Input() systemId: string;

    CONFIG: IConfig;
    icons = icons;

    public showIP: boolean = false;
    public token: string = '';

    public mediaservers: Array<MediaServer>;
    public processedMediaservers: Array<MediaServer>;

    public previewLoaded = {};
    public isCameraVisible: { [key: string]: boolean } = {};

    public handlePreviewLoaded(cid): void {
        this.previewLoaded[cid] = true;
    }

    public handlePreviewError(cid): void {
        this.previewLoaded[cid] = -1;
    }

    public isServerExpanded: {
        [serverId: string]: boolean;
    } = {};

    constructor(
        private localStorage: LocalStorageService,
        configService: NxConfigService,
        @Inject(LOCALE_ID) private locale: string,
    ) {
        this.CONFIG = configService.config;
    }

    public ngOnChanges(changes: NgChanges<MediaServerListComponent>) {
        if (changes._mediaservers?.previousValue !== changes._mediaservers?.currentValue) {
            this.previewLoaded = {};
            this.processedMediaservers = this._mediaservers || [];
            this.processedMediaservers.sort(alphabeticalSort(this.locale, ms => ms.name));
            this.processedMediaservers.forEach(ms => {
                ms.cameras.sort(alphabeticalSort(this.locale, cam => cam.name));
            });
        }
        this._resetServersVisibility();
        this.updateFilteredList(this.token);
    }

    protected _resetServersVisibility(): void {
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
    }

    public changeServerVisibility(serverId: string): void {
        this.isServerExpanded[serverId] = !this.isServerExpanded[serverId];
        const key = `nx_system_${this.systemId}_server_${serverId}_expansion_status`;
        this.localStorage.store(key, JSON.stringify(this.isServerExpanded[serverId]));
    }

    public updateShowIP(newValue: boolean): void {
        this.showIP = newValue;
    }

    public updateFilteredList(token: string) {
        this.token = token;
        if (!token) {
            this.mediaservers = this.processedMediaservers;
            return;
        }
        token = token.toLocaleLowerCase();
        this.mediaservers = this.processedMediaservers.reduce((acc: any[], ms) => {
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

    public cameraId(index, camera) {
        return camera ? camera.id : undefined;
    }

    public serverID(index, server) {
        return server ? server.id : undefined;
    }
}
