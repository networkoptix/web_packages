import { Component, Input, OnInit } from '@angular/core';
import { DomSanitizer }      from '@angular/platform-browser';
import { NxConfigService }   from '../../services/nx-config';
import { NxAppStateService } from '../../services/nx-app-state.service';
import { ActivatedRoute }            from '@angular/router';
import { NxSettingsService } from '../../pages/systems/settings/settings.service';

@Component({
    selector: 'nx-footer',
    templateUrl: 'footer.component.html',
    styleUrls: [ 'footer.component.scss' ]
})
 export class NxFooterComponent implements OnInit {
    companyLink: string;
    companyName: string;
    copyrightYear: string;
    config: any;
    footerItems: any;
    viewFooter: boolean;

    // options
    @Input() center: boolean;
    classes: string[] = [];

    constructor(private sanitizer: DomSanitizer,
                private _config: NxConfigService,
                private appState: NxAppStateService,
                private route: ActivatedRoute,
                private systemSettingsService: NxSettingsService) {
        this.config = this._config.getConfig();
    }

    ngOnInit() {
        this.companyLink = this.config.companyLink;
        this.companyName = this.config.companyName;
        this.copyrightYear = this.config.copyrightYear;
        this.footerItems = this.config.footerItems;

        this.appState.footerVisibleObservable.subscribe((visible) => {
            this.viewFooter = visible;
        });

        this.route.url.subscribe(() => {
            this.updateFooterStyling();
        });

        this.systemSettingsService.systemSubject.subscribe((system) => {
            if (system) {
                this.updateFooterStyling();
            }
        });
    }

    updateFooterStyling() {
        if (this.route.routeConfig) {
            this.classes = [];
            const path = this.route.routeConfig.path;
            const system = this.systemSettingsService.system;

            if (path === 'account') {
                const childPath = this.route.firstChild.routeConfig.path;
                if (childPath === 'password') {
                    this.classes.push('col-xxxl-6');
                }
            }

            if (path === 'systems/:systemId' && system) {
                const childPath = this.route.firstChild.routeConfig.path;
                if (childPath === '' && system.isMine || childPath.includes('users')) {
                    this.classes.push('col-xxxl-6');
                }
            }
        }
    }
}
