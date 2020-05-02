import {
    Component, OnDestroy, OnInit
}                                    from '@angular/core';
import { NxConfigService, IConfig }  from '../../services/nx-config';
import { NxLanguageProviderService } from '../../services/nx-language-provider';
import { NxAccountService }          from '../../services/account.service';
import { NxDialogsService }          from '../../dialogs/dialogs.service';
import { ActivatedRoute }            from '@angular/router';
import { NxUriService }              from '../../services/uri.service';
import { LocalStorageService }       from 'ngx-store';
import { NxProcessService }          from '../../services/process.service';
import { NxCloudApiService }         from '../../services/nx-cloud-api';
import { NxSystemsService }          from '../../services/systems.service';
import { NxMenuService }             from '../../components/menu/menu.service';
import { Subscription }              from 'rxjs';
import { AutoUnsubscribe }           from 'ngx-auto-unsubscribe';
import { LanguageI18NStaticTypes }   from '../../../language_i18n_static_types';

@AutoUnsubscribe()
@Component({
    selector   : 'account',
    templateUrl: 'account.component.html',
    styleUrls  : ['account.component.scss']
})

export class NxAccountComponent implements OnInit, OnDestroy {

    CONFIG: IConfig;
    LANG: LanguageI18NStaticTypes;

    content: any = {};
    menuReady = false;

    account: any = {};
    pass: any = {};

    save: any;
    changePassword: any;
    private menuDetailSubscription: Subscription;

    private setupDefaults(configService) {
        this.CONFIG = configService.getConfig();
        this.LANG = this.language.getTranslations();

        this.pass = {
            password   : '',
            newPassword: ''
        };
    }

    constructor(configService: NxConfigService,
                private route: ActivatedRoute,
                private localStorage: LocalStorageService,
                private processService: NxProcessService,
                private cloudApiService: NxCloudApiService,
                private language: NxLanguageProviderService,
                private systemsService: NxSystemsService,
                private accountService: NxAccountService,
                private dialogs: NxDialogsService,
                private uriService: NxUriService,
                private menuService: NxMenuService,
    ) {
        this.setupDefaults(configService);
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
            base: accountMenu.baseUrl,
            selectedSection   : accountMenu.settings.id,
            level1            : [
                {
                    id   : accountMenu.settings.id,
                    icon : accountMenu.icon,
                    label: this.account.email,
                    path : accountMenu.settings.path,
                    level3: [
                        {
                            id: accountMenu.settings.id,
                            label: this.LANG.account.accountSettings,
                            path: accountMenu.settings.path
                        },
                        {
                            id: accountMenu.password.id,
                            label: this.LANG.account.changePassword,
                            path: accountMenu.password.path
                        }
                    ]
                }
            ]
        };

        this.menuDetailSubscription = this.menuService
            .selectedDetailsSection
            .subscribe(selection => {
                this.content.selectedDetailsSection = selection;
                this.content = {...this.content}; // trigger onChange
                this.menuReady = true;
            });
    }
}

