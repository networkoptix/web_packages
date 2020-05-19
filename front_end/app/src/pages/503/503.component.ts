import {
    Component, OnInit
}                                   from '@angular/core';
import { Router }                   from '@angular/router';
import { DomSanitizer, SafeHtml }   from '@angular/platform-browser';
import { NxPageService }            from '../../services/page.service';
import { NxConfigService, IConfig } from '../../services/nx-config';
import { NxAppStateService }        from '../../services/nx-app-state.service';
import { NxCloudApiService }        from '../../services/nx-cloud-api';

@Component({
    selector  : 'nx-503',
    styleUrls : ['503.component.scss'],
    template  : `<div [innerHTML]="compTemplate"></div>`
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
        private apiService: NxCloudApiService
    ) {
        this.CONFIG = configService.getConfig();

        this.pageService.setPageTitle('Maintenance is in progress');
        this.appState.setFooterVisibility(false);
        this.appState.setHeaderVisibility(false);
    }

    ngOnInit() {
        this.apiService
            .getStatic('/static/503.html')
            .toPromise()
            .then((result) => {
                this.compTemplate = this.sanitizer.bypassSecurityTrustHtml(result);
            }).catch((ex) => { console.error(ex); });
    }

    ngAfterViewInit() {
        setTimeout(() => {
            this.router.navigate(['/']).catch(() => console.error('Error navigating to the index'));
        }, this.CONFIG.maintenanceTimeout);
    }
}
