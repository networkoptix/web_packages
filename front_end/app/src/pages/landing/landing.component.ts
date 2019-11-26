import { Component, OnDestroy, OnInit } from '@angular/core';
import { Router }                       from '@angular/router';

import { NxConfigService }           from '../../services/nx-config';
import { NxDialogsService }          from '../../dialogs/dialogs.service';
import { NxAccountService }          from '../../services/account.service';
import { NxPageService }             from '../../services/page.service';
import { NxLanguageProviderService } from '../../services/nx-language-provider';
import { NxSessionService }          from '../../services/session.service';
import { LocalStorageService }       from 'ngx-store';

@Component({
    selector   : 'landing-component',
    templateUrl: 'landing.component.html',
    styleUrls  : ['landing.component.scss']
})

export class NxLandingComponent implements OnInit, OnDestroy {

    CONFIG: any = {};
    LANG: any = {};

    params: any;
    userEmail: any;
    login: any;

    loaded: boolean;

    private setupDefaults() {
        this.CONFIG = this.config.getConfig();
        this.LANG = this.language.getTranslations();
    }

    constructor(private config: NxConfigService,
                private dialogs: NxDialogsService,
                private accountService: NxAccountService,
                private pageService: NxPageService,
                private language: NxLanguageProviderService,
                private router: Router,
                private localStorage: LocalStorageService,
    ) {
        this.setupDefaults();
    }

    ngOnInit(): void {
        if (this.router.url === '/content/about') {
            this.loaded = true;
        } else {
            this.accountService
                .get()
                .then(account => {
                    // TODO: remove this hack after we retire AJS
                    // downgraded component cause this page to load twice and we end up with two login dialogs
                    if (account) {
                        this.accountService.redirectAuthorised();
                        this.userEmail = this.accountService.getEmail();
                    } else {
                        if (this.router.url.includes('/login') && !this.localStorage.get('login')) {
                            this.localStorage.set('login', true);
                            this.login = this.dialogs.login(this.accountService, false, false);
                            this.pageService.setPageTitle(this.LANG.pageTitles.login);
                        } else {
                            this.loaded = true;
                            this.pageService.setPageTitle(this.LANG.pageTitles.default);
                        }
                    }
                }).catch(() => {
                    this.pageService.setPageTitle(this.LANG.pageTitles.default);
                    this.loaded = true;
                });
        }
    }

    ngOnDestroy() {
        this.localStorage.remove('login');
    }
}

