import { Component, OnInit }         from '@angular/core';
import { NxConfigService }           from '../../services/nx-config';
import { NxLanguageProviderService } from '../../services/nx-language-provider';
import { NxAccountService }          from '../../services/account.service';
import { NxDialogsService }          from '../../dialogs/dialogs.service';
import { ActivatedRoute }            from '@angular/router';
import { NxUriService }              from '../../services/uri.service';
import { NxPageService }             from '../../services/page.service';
import { LocalStorageService }       from 'ngx-store';
import { NxProcessService }          from '../../services/process.service';
import { NxCloudApiService }         from '../../services/nx-cloud-api';
import { NxSystemsService }          from '../../services/systems.service';
import { NxMenuService }             from '../../components/menu/menu.service';

@Component({
    selector   : 'account',
    templateUrl: 'account.component.html',
    styleUrls  : ['account.component.scss']
})

export class NxAccountComponent implements OnInit {

    CONFIG: any;
    LANG: any;

    content: any = {};
    menuReady = false;

    account: any = {};
    pass: any = {};

    save: any;
    changePassword: any;

    private setupDefaults() {
        this.CONFIG = this.config.getConfig();
        this.LANG = this.language.getTranslations();

        this.pass = {
            password   : '',
            newPassword: ''
        };
    }

    constructor(private route: ActivatedRoute,
                private localStorage: LocalStorageService,
                private config: NxConfigService,
                private processService: NxProcessService,
                private cloudApiService: NxCloudApiService,
                private language: NxLanguageProviderService,
                private systemsService: NxSystemsService,
                private accountService: NxAccountService,
                private dialogs: NxDialogsService,
                private uriService: NxUriService,
                private pageService: NxPageService,
                private menuService: NxMenuService
    ) {
        this.setupDefaults();
    }

    ngOnInit(): void {
        const mode = this.route.snapshot.data.passwordMode;

        const title = (!mode) ? this.LANG.pageTitles.account : this.LANG.pageTitles.changePassword;
        this.pageService.setPageTitle(title);

        if (this.route.snapshot.data.auth) {
            let auth;
            try {
                auth = atob(this.route.snapshot.data.auth);
            } catch (exception) {
                auth = false;
                console.error(exception);
            }
            if (auth) {
                const index = auth.indexOf(':');
                const tempLogin = auth.substring(0, index);
                const tempPassword = auth.substring(index + 1);

                this.accountService
                    .login(tempLogin, tempPassword, false)
                    .then(() => {
                        this.accountService
                            .get()
                            .then((account) => {
                                this.account = account;
                                this.init();
                            });

                    })
                    .finally(() => {
                        this.uriService.updateURI('', { auth: undefined });
                    });
            }
        } else {
            this.accountService
                .checkLoginState()
                .then(() => {
                    this.accountService
                        .get()
                        .then((account) => {
                            this.account = account;
                            this.init();
                        });

                })
                .catch(() => {
                    this.dialogs.login(this.accountService, true);
                });
        }
    }

    init(): void {
        this.content = {
            base: '/account',
            selectedSection   : 'account',
            selectedDetailsSection: '',
            level1            : [
                {
                    id   : 'account',
                    icon : 'glyphicon-user',
                    label: this.account.email,
                    path : '',
                    level3: [
                        {
                            id: 'settings',
                            label: 'Account Settings',
                            path: ''
                        },
                        {
                            id: 'password',
                            label: 'Password',
                            path: 'password'
                        }
                    ]
                }
            ]
        };

        this.menuService
            .selectedDetailsSection
            .subscribe(selection => {
                this.content.selectedDetailsSection = selection;
                this.content = {...this.content}; // trigger onChange
                this.menuReady = true;
            });
    }
}

