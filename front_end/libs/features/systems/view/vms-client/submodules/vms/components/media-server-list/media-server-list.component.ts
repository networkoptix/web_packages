import { Component, Inject, LOCALE_ID, OnInit } from '@angular/core';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { LocalStorageService } from 'ngx-webstorage';

import type { IConfig } from '@services/nx-config/config-types';
import { NxConfigService } from '@services/nx-config/nx-config.service';
import { alphabeticalSort } from '@utils/general';

import { MediaServer } from '../../datatypes/MediaServer';
import { VmsState, VMS_MODE } from '../../datatypes/VmsState';
import { VideoManagementSystemService } from '../../services/vms.service';

@UntilDestroy()
@Component({
    selector: 'nx-media-server-list',
    templateUrl: 'media-server-list.component.html',
    styleUrls: ['media-server-list.component.scss']
})
export class MediaServerListComponent implements OnInit {
    CONFIG: IConfig;

    protected _mediaservers: Array<MediaServer>;
    public showIP: boolean = false;
    public token: string = '';

    public mediaservers: Array<MediaServer>;

    public previewLoaded = {};
    public isCameraVisible: { [key: string]: boolean } = {};

    public handlePreviewLoaded(cid): void {
        this.previewLoaded[cid] = true;
    }

    public handlePreviewError(cid): void {
        this.previewLoaded[cid] = -1;
    }

    public isServerExpanded: {
        [serverId: string]: boolean
    } = {};

    public activeCameraId: string;

    constructor(
        private localStorage: LocalStorageService,
        private vms: VideoManagementSystemService,
        configService: NxConfigService,
        @Inject(LOCALE_ID) private locale: string,
    ) {
        this.CONFIG = configService.config;
    }

    public ngOnInit(): void {
        this.vms.subject
            .pipe(untilDestroyed(this))
            .subscribe((s: VmsState) => {
                this._onVmsSubjectChange(s);
            });
    }

    protected _onVmsSubjectChange(s: VmsState) {
        switch (s.mode) {
            case VMS_MODE.NOT_INITIALIZED:
                this._mediaservers = [];
                break;
            case VMS_MODE.CAMERA_NOT_SELECTED:
            case VMS_MODE.CAMERA_SELECTED:
                this._mediaservers = s.mediaServers;
                setTimeout(() => {
                    this.activeCameraId = s.mode === VMS_MODE.CAMERA_SELECTED
                        ? this.vms.selectedCamera?.id
                        : undefined;
                }, 0);
                this._mediaservers.sort(alphabeticalSort(this.locale, ms => ms.name));
                this._mediaservers.forEach(ms => {
                    ms.cameras.sort(alphabeticalSort(this.locale, cam => cam.name));
                });
        }
        this._resetServersVisibility();
        this.updateFilteredList(this.token);
    }

    protected _resetServersVisibility(): void {
        if (this._mediaservers) {
            this.isServerExpanded = this._mediaservers.reduce(
                (acc, ms) => {
                    const systemId = this.vms.systemId;
                    const key = `nx_system_${systemId}_server_${ms.id}_expansion_status`;
                    const status = this.localStorage.retrieve(key);
                    acc[ms.id] = status ? JSON.parse(status) : true;
                    return acc;
                },
                {}
            );
        } else {
            this.isServerExpanded = {};
        }
    }

    public changeServerVisibility(serverId: string): void {
        this.isServerExpanded[serverId] = !this.isServerExpanded[serverId];
        const systemId = this.vms.systemId;
        const key = `nx_system_${systemId}_server_${serverId}_expansion_status`;
        this.localStorage.store(key, JSON.stringify(this.isServerExpanded[serverId]));
    }

    public updateShowIP(newValue: boolean): void {
        this.showIP = newValue;
    }

    public updateFilteredList(token: string) {
        this.token = token;
        if (!token) {
            this.mediaservers = this._mediaservers;
            return;
        }
        token = token.toLocaleLowerCase();
        this.mediaservers = this._mediaservers.reduce((acc: any[], ms) => {
            const cameras = ms.cameras.filter(c =>
                c.name.toLocaleLowerCase().includes(token) ||
                c.url.toLocaleLowerCase().includes(token)
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
