import { Component, OnInit }       from '@angular/core';
import { Router }                  from '@angular/router';
import { LocalStorageService }     from 'ngx-store';

import {
    NxConfigService, IConfig,
    NxAccountService, NxPageService,
    NxLanguageProviderService
}  from '../../services';
import { NxDialogsService }        from '../../dialogs';
import { LanguageI18NStaticTypes } from '../../../language_i18n_static_types';

@Component({
    selector   : 'landing-component',
    templateUrl: 'landing.component.html',
    styleUrls  : ['landing.component.scss']
})

export class NxLandingComponent implements OnInit {

    CONFIG: IConfig;
    LANG: LanguageI18NStaticTypes;

    params;
    userEmail;
    login;

    loaded: boolean;

    private setupDefaults(configService) {
        this.CONFIG = configService.getConfig();
        this.LANG = this.language.translations;
    }

    constructor(configService: NxConfigService,
                private dialogs: NxDialogsService,
                private accountService: NxAccountService,
                private pageService: NxPageService,
                private language: NxLanguageProviderService,
                private router: Router,
                private localStorage: LocalStorageService,
    ) {
        this.setupDefaults(configService);
    }

    ngOnInit(): void {
        this.pageService.pageTitle = this.LANG.pageTitles.default;
        if (this.router.url === '/logout') {
            this.accountService.logout();
        } else if (this.router.url.includes('/content/about')) {
            this.loaded = true;
            this.pageService.pageTitleRemoveHyphen = this.LANG.pageTitles.about;
        } else {
            this.accountService
                .get(/* forceUpdate */true)
                .then(account => {
                    if (account) {
                        this.accountService.redirectAuthorised();
                        this.userEmail = this.accountService.email;
                    } else {
                        if (this.router.url.includes('/login')) {
                            this.login = this.dialogs.login(this.accountService, false, false);
                            this.pageService.pageTitle = this.LANG.pageTitles.login;
                        } else {
                            this.loaded = true;
                        }
                    }
                }).catch(() => {
                    this.pageService.pageTitle = this.LANG.pageTitles.default;
                    this.loaded = true;
                });
        }
    }
}

