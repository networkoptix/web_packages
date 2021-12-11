import { Component, OnInit } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { Router } from '@angular/router';

import { NxAppStateService } from '@services/nx-app-state.service';
import { NxBootstrapProvider } from '@services/nx-bootstrap-provider';
import { NxCloudApiService } from '@services/nx-cloud-api';
import { NxConfigService, IConfig } from '@services/nx-config';
import { NxPageService } from '@services/page.service';

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
        private pageService: NxPageService,
        private router: Router,
        private sanitizer: DomSanitizer,
        private apiService: NxCloudApiService,
        private bootstrapProvider: NxBootstrapProvider
    ) {
        this.CONFIG = configService.getConfig();

        this.pageService.pageTitle = 'Maintenance is in progress';
        this.appState.footerVisibility = false;
        this.appState.headerVisibility = false;
    }

    ngOnInit() {
        this.apiService
            .getStatic('/static/503.html')
            .toPromise()
            .then((result) => {
                this.compTemplate =
                    this.sanitizer.bypassSecurityTrustHtml(result);
            }).catch((ex) => { console.error(ex); });
    }

    ngAfterViewInit() {
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
