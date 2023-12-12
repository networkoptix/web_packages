import { CommonModule } from '@angular/common';
import { Component, Input, OnChanges } from '@angular/core';
import { RouterModule } from '@angular/router';
import { AngularSvgIconModule } from 'angular-svg-icon';
import { LocalStorageService } from 'ngx-webstorage';

import { NxPreLoaderComponent } from '@components/placeholders/pre-loader/pre-loader.component';
import { NxSearchHighlightComponent } from '@components/search-highlight/search-highlight.component';
import { NxAddSvgSrcDirective } from '@directives/add-data.directive';
import { NxIntersectionObserver } from '@directives/nx-intersection.directive';
import { PipesModule } from '@pipes/pipes.module';
import type { IConfig } from '@services/nx-config/config-types';
import { NxConfigService } from '@services/nx-config/nx-config.service';
import { icons } from '@static-variables';
import { alphabeticalSort } from '@utils/general';
import { NgChanges } from '@utils/ng-changes';

import { ViewCamera } from '../../datatypes/Camera';
import type { ViewMediaServer } from '../../datatypes/IMediaServer';

import { NxMediaServerListHeaderComponent } from './media-server-list-header/media-server-list-header.component';

@Component({
    selector: 'nx-media-server-list',
    templateUrl: 'media-server-list.component.html',
    styleUrls: ['media-server-list.component.scss'],
    standalone: true,
    imports: [
        CommonModule,
        RouterModule,

        AngularSvgIconModule,

        NxAddSvgSrcDirective,
        NxIntersectionObserver,
        NxPreLoaderComponent,
        PipesModule,
        NxSearchHighlightComponent,
        NxMediaServerListHeaderComponent,
    ],
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
    ) {
        this.CONFIG = configService.config;
    }

    ngOnChanges(changes: NgChanges<MediaServerListComponent>): void {
        if (changes._mediaservers?.previousValue !== changes._mediaservers?.currentValue) {
            this.previewLoaded = {};
            this.processedMediaservers = this._mediaservers || [];
            this.processedMediaservers.sort(alphabeticalSort(ms => ms.name));
            this.processedMediaservers.forEach(ms => {
                ms.cameras.sort(alphabeticalSort(cam => cam.name));
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
