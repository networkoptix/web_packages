import { Component, Input, OnInit } from '@angular/core';
import { DomSanitizer }      from '@angular/platform-browser';
import { NxConfigService }   from '../../services/nx-config';
import { NxAppStateService } from '../../services/nx-app-state.service';
import { ActivatedRoute, Router }            from '@angular/router';

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
                private router: Router) {
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

        this.route.url.subscribe((a) => {
            this.classes = [];
            const url = this.router.url;
            if (url === '/account/password') {
                this.classes.push('col-xxxl-6');
            }
        });
    }
}
