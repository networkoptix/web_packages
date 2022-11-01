import { Component, OnInit } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { Router } from '@angular/router';

import { NxAppStateService } from '@services/nx-app-state.service';
import { NxBootstrapProvider } from '@services/nx-bootstrap-provider';
import { NxCloudApiService } from '@services/nx-cloud-api';
import type { IConfig } from '@services/nx-config/config-types';
import { NxConfigService } from '@services/nx-config/nx-config.service';

@Component({
    selector: 'nx-503',
    styleUrls: ['503.component.scss'],
    template: '<div [innerHTML]="compTemplate"></div>'
})
export class Nx503Component implements OnInit {
    compTemplate: SafeHtml;
    CONFIG: IConfig;

    constructor(
        configService: NxConfigService,
        private appState: NxAppStateService,
        private router: Router,
        private sanitizer: DomSanitizer,
        private apiService: NxCloudApiService,
        private bootstrapProvider: NxBootstrapProvider
    ) {
        this.CONFIG = configService.getConfig();

        this.appState.footerVisibility = false;
        this.appState.headerVisibility = false;
    }

    ngOnInit(): void {
        this.apiService
            .getStatic('/static/503.html')
            .toPromise()
            .then(result => {
                this.compTemplate =
                    this.sanitizer.bypassSecurityTrustHtml(result);
            }).catch(ex => { console.error(ex); });
    }

    ngAfterViewInit(): void {
        setTimeout(() => {
            this.bootstrapProvider
                .load()
                .then(() => {
                    if (this.bootstrapProvider.loaded) {
                        this.router.navigate(['/']).catch(() =>
                            console.error('Error navigating to the index')
                        );
                    }
                });
        }, this.CONFIG.maintenanceTimeout);
    }
}
