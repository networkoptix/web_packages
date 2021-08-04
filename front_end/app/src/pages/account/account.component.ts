import {
    Component, OnDestroy, OnInit
}                                    from '@angular/core';
import { ActivatedRoute }            from '@angular/router';
import { UntilDestroy }              from '@ngneat/until-destroy';
import { Subscription }              from 'rxjs';

import { NxLanguageProviderService } from '../../services/nx-language-provider';
import { NxConfigService, IConfig }  from '../../services/nx-config';
import { NxAccountService }          from '../../services/account.service';
import { NxUriService }              from '../../services/uri.service';
import { NxProcessService }          from '../../services/process.service';
import { NxCloudApiService }         from '../../services/nx-cloud-api';
import { NxSystemsService }          from '../../services/systems.service';
import { NxDialogsService }          from '../../dialogs/dialogs.service';
import { NxMenuService }             from '../../menu';
import { LanguageI18NStaticTypes }   from '../../../language_i18n_static_types';

@UntilDestroy({ checkProperties: true })
@Component({
    selector    : 'account',
    templateUrl : 'account.component.html',
    styleUrls   : ['account.component.scss']
})

export class NxAccountComponent implements OnInit, OnDestroy {

    CONFIG: IConfig;
    LANG: LanguageI18NStaticTypes;

    content: any = {};
    menuReady = false;

    account: any = {};
    pass: any = {};

    save;
    changePassword;
    private menuDetailSubscription: Subscription;

    private setupDefaults() {
        this.pass = {
            password    : '',
            newPassword : ''
        };
    }

    constructor(
        configService: NxConfigService,
        languageService: NxLanguageProviderService,
        private route: ActivatedRoute,
        private processService: NxProcessService,
        private cloudApiService: NxCloudApiService,
        private systemsService: NxSystemsService,
        private accountService: NxAccountService,
        private dialogs: NxDialogsService,
        private uriService: NxUriService,
        private menuService: NxMenuService
    ) {
        this.CONFIG = configService.getConfig();
        languageService.translateSubject.subscribe(translation => {
            this.LANG = translation as LanguageI18NStaticTypes;
            this.init();
        });

        this.setupDefaults();
    }

    ngOnDestroy() {}

    ngOnInit(): void {
        this.accountService.get()
            .then((account) => {
                this.account = account;
                this.init();
            });
    }

    init(): void {
        const accountMenu = this.CONFIG.menus.account;
        if (this.account === undefined) {
            return;
        }
        this.content = {
            base            : accountMenu.baseUrl,
            selectedSection : accountMenu.settings.id,
            level1          : [
                {
                    id     : accountMenu.settings.id,
                    icon   : accountMenu.icon,
                    label  : this.account.email || this.account.first_name,
                    path   : accountMenu.settings.path,
                    level3 : [
                        {
                            id    : accountMenu.settings.id,
                            label : this.LANG.account.accountSettings(),
                            path  : accountMenu.settings.path
                        },
                        {
                            id    : accountMenu.password.id,
                            label : this.LANG.account.changePassword(),
                            path  : accountMenu.password.path
                        },
                        {
                            id    : accountMenu.security.id,
                            label : this.LANG.account.security(),
                            path  : accountMenu.security.path
                        }
                    ]
                }
            ]
        };

        this.menuDetailSubscription = this.menuService
            .selectedDetailsSection
            .subscribe(selection => {
                this.content.selectedDetailsSection = selection;
                this.content = { ...this.content }; // trigger onChange
                this.menuReady = true;
            });
    }
}
