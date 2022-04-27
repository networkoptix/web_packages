import { Component, OnInit, OnDestroy } from '@angular/core';
import { LocalStorageService } from 'ngx-webstorage';
import { Subscription } from 'rxjs';

import type { IConfig } from '@services/nx-config/config-types';
import { NxConfigService } from '@services/nx-config/nx-config.service';
import { htmlToEntity } from '@utils/general';

import { ICamera } from '../../datatypes/ICamera';
import { MediaServer } from '../../datatypes/MediaServer';
import { VmsState, VMS_MODE } from '../../datatypes/VmsState';
import { VideoManagementSystemService } from '../../services/vms.service';

@Component({
    selector: 'media-server-list',
    templateUrl: 'media-server-list.component.html',
    styleUrls: ['media-server-list.component.scss']
})
export class MediaServerListComponent implements OnInit, OnDestroy {
    CONFIG: IConfig;
    protected _vmsStateSubscription: Subscription;
    protected _mediaservers: Array<MediaServer>;
    public showIP: boolean = false;
    public token: string = '';

    public mediaservers: Array<MediaServer>;

    public previewLoaded = {};

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
        configService: NxConfigService
    ) {
        this._onVmsSubjectChange = this._onVmsSubjectChange.bind(this);
        this.CONFIG = configService.config;
    }

    public ngOnInit(): void {
        this._vmsStateSubscription = this.vms.subject.subscribe(
            this._onVmsSubjectChange
        );
    }

    public ngOnDestroy(): void {
        this._vmsStateSubscription.unsubscribe();
    }

    protected _onVmsSubjectChange(s: VmsState) {
        switch (s.mode) {
            case VMS_MODE.NOT_INITIALIZED:
                this._mediaservers = [];
                break;
            case VMS_MODE.CAMERA_NOT_SELECTED:
            case VMS_MODE.CAMERA_SELECTED:
                this._mediaservers = s.mediaServers;
                this._mediaservers.forEach(server => {
                    server.name = htmlToEntity(server.name);
                    server.cameras.forEach(camera => {
                        camera.name = htmlToEntity(camera.name);
                    });
                });
                setTimeout(() => {
                    this.activeCameraId = s.mode === VMS_MODE.CAMERA_SELECTED
                        ? this.vms.selectedCamera?.id
                        : undefined;
                }, 0);
                const cameraComparator = (c1: ICamera, c2: ICamera) => {
                    const n1 = c1.name.toLocaleLowerCase();
                    const n2 = c2.name.toLocaleLowerCase();
                    return n1 > n2 ? +1 : n1 < n2 ? -1 : 0;
                };
                this._mediaservers.sort((ms1, ms2) => {
                    const n1 = ms1.name.toLocaleLowerCase();
                    const n2 = ms2.name.toLocaleLowerCase();
                    return n1 > n2 ? +1 : n1 < n2 ? -1 : 0;
                });
                this._mediaservers.forEach(ms => {
                    ms.cameras.sort(cameraComparator);
                    ms.cameras.sort(cameraComparator);
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
