import {
    Component, Input,
    OnDestroy, OnInit
}                                 from '@angular/core';
import {
    ActivatedRoute, Router, NavigationEnd
}                                 from '@angular/router';
import { UntilDestroy }           from '@ngneat/until-destroy';
import { Subscription }           from 'rxjs';
import { filter, tap }            from 'rxjs/operators';

import { NxConfigService, IConfig }  from '@services/nx-config';
import { NxLanguageProviderService } from '@services/nx-language-provider';
import { NxProcessService, Process } from '@services/process.service';
import { NxDialogsService }          from '@dialogs/dialogs.service';
import {
    NxSystem, NxSystemService
}                                    from '@services/system.service';
import { NxSystemsService }          from '@services/systems.service';
import { Account, NxAccountService } from '@services/account.service';
import { NxUtilsService }            from '@services/utils.service';
import { NxUriService }              from '@services/uri.service';
import { NxScrollMechanicsService }  from '@services/scroll-mechanics.service';
import { NxApplyService }            from '@services/apply.service';
import { NxPageService }             from '@services/page.service';
import { LanguageI18NStaticTypes }   from '@app/language_i18n_static_types';
import { NxAppStateService }         from '@services/nx-app-state.service';

@UntilDestroy({ checkProperties: true })
@Component({
    selector    : 'nx-authorize-component',
    templateUrl : 'authorize.component.html',
    styleUrls   : ['authorize.component.scss']
})
export class NxAuthorizeComponent implements OnInit, OnDestroy {
    CONFIG: IConfig;
    LANG: LanguageI18NStaticTypes;
    plugin;
    content: any = {};

    footerItems: { name: string, url: string }[];

    account: Account;
    system: NxSystem|any;
    systems;
    windowWideEnough = true;

    constructor(
        configService: NxConfigService,
        languageService: NxLanguageProviderService,
        private route: ActivatedRoute,
        private accountService: NxAccountService,
        private pageService: NxPageService,
        private dialogs: NxDialogsService,
        private systemService: NxSystemService,
        private systemsService: NxSystemsService,
        private processService: NxProcessService,
        private uriService: NxUriService,
        private router: Router,
        private scrollMechanicsService: NxScrollMechanicsService,
        private applyService: NxApplyService,
        private appStateService: NxAppStateService
    ) {
        this.LANG = languageService.translations;
        this.CONFIG = configService.getConfig();
    }

    ngOnInit(): void {
        this.footerItems = this.CONFIG.dynamicMenus.authorizeFooter;
    }

    // init(): void {
    //     // this.systemId = this.uriParamSystemId;
    //     this.routerParamsSubscription = this.route.params.subscribe(params => {
    //         if (params.systemId) {
    //             this.systemId = params.systemId;
    //             this.content.base = this.CONFIG.menus.systemSettings.baseUrl + this.systemId;
    //             this.content = { ...this.content }; // trigger onChange
    //             if (!this.CONFIG.isLocal && this.system) {
    //                 this.system.stopPoll();
    //                 this.system = undefined;
    //                 this.settingsService.system = undefined;
    //             }
    //             this.systemNoAccess = false;
    //             this.menuVisible = false;
    //         } else {
    //             this.systemId = '';
    //         }
    //         this.getSystemInfo();
    //     });

    //     this.router.events.subscribe(route => {
    //         if (route instanceof NavigationEnd) {
    //             const isSystemRoute = route.url.includes('/systems');
    //             const isCameraRoute = route.url.includes('/cameras');
    //             if (isSystemRoute && !isCameraRoute && this.system) {
    //                 this.system.show404 = false;
    //             }
    //         }
    //     });

    //     this.content = {
    //         selectedSection    : '', // updated by selectedSectionSubject
    //         selectedSubSection : '', // updated by selectedSubSectionSubject
    //         system             : {}, // updated by getSystemInfo
    //         base               : this.CONFIG.menus.systemSettings.baseUrl + this.systemId,
    //         level1             : [
    //             {
    //                 id     : this.CONFIG.menus.systemSettings.admin.id,
    //                 svg    : this.CONFIG.menus.systemSettings.admin.icon,
    //                 label  : this.LANG.menu.titles.systemAdministration(),
    //                 path   : this.CONFIG.menus.systemSettings.admin.path,
    //                 level2 : []
    //             }
    //         ]
    //     };
    // }

    ngOnDestroy() {
    }
}
