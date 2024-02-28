import { Component, OnInit } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { firstValueFrom } from 'rxjs';

import { NxAppStateService } from '@services/nx-app-state.service';
import { NxCloudApiService } from '@services/nx-cloud-api';

@Component({
    selector: 'nx-503',
    styleUrls: ['503.component.scss'],
    template: '<div [innerHTML]="compTemplate"></div>',
})
export class Nx503Component implements OnInit {
    compTemplate: SafeHtml;
    readonly maintenanceTimeout: number = 60 * 1000;

    constructor(
        private appState: NxAppStateService,
        private sanitizer: DomSanitizer,
        private apiService: NxCloudApiService,
    ) {
        this.appState.footerVisibility = false;
        this.appState.headerVisibility = false;
    }

    ngOnInit(): void {
        firstValueFrom(this.apiService.getStatic('/static/503.html'))
            .then(result => {
                this.compTemplate = this.sanitizer.bypassSecurityTrustHtml(result);
            })
            .catch(ex => {
                console.error(ex);
            });
    }
}
