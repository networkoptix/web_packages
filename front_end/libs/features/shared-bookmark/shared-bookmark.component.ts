import { Component, Input, OnInit } from '@angular/core';

import { NxAppStateService } from '@services/nx-app-state.service';
import { nxConfig } from '@services/nx-config/config';

@Component({
    selector: 'nx-shared-bookmark',
    styleUrls: ['shared-bookmark.component.scss'],
    templateUrl: 'shared-bookmark.component.html',
})
export class SharedBookmarkComponent implements OnInit {
    @Input() systemId: string;
    @Input() bookmarkId: string;

    CONFIG = nxConfig;

    startTime: Date;

    baseUrl: string;

    constructor(appStateService: NxAppStateService) {
        appStateService.headerVisibility = false;
        // TODO: remove startTime
        this.startTime = new Date();
    }

    ngOnInit(): void {
        this.baseUrl = this.getUrlBase();
    }

    getUrlBase(): string {
        return (
            'https://' +
            this.CONFIG.trafficRelayHost
                .replace('{host}', window.location.host)
                .replace('{systemId}', this.systemId)
        );
    }
}
