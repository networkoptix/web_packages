import {
    Component, Inject, OnDestroy,
    OnInit, ViewContainerRef
}                                               from '@angular/core';
import { Location }                             from '@angular/common';
import { ActivatedRoute, Router }                       from '@angular/router';
import { UntilDestroy }                         from '@ngneat/until-destroy';

import { NxDialogsService }                     from '@dialogs/dialogs.service';
import { NxConfigService, IConfig }             from '@services/nx-config';
import { NxPageService }                        from '@services/page.service';
import { NxLanguageProviderService }            from '@services/nx-language-provider';
import { NxUtilsService }                       from '@services/utils.service';
import { NxSystem, NxSystemRole, NxSystemUser } from '@services/system.service';
import { NxProcessService, Process }            from '@services/process.service';
import { NxUriService }                         from '@services/uri.service';
import { NxApplyService, Watcher }              from '@services/apply.service';
import { NxToastService }                       from '@dialogs/toast.service';
import { LanguageI18NStaticTypes }              from '../../../../language_i18n_static_types';
import { WINDOW }                               from '@services/window-provider';

@UntilDestroy({ checkProperties: true })
@Component({
    selector    : 'nx-authorize-password-component',
    templateUrl : 'password.component.html',
    styleUrls   : ['password.component.scss']
})

export class NxAuthorizePasswordComponent implements OnInit, OnDestroy {
    CONFIG: IConfig;
    LANG: LanguageI18NStaticTypes;

    passwordProcess: Process;
    accountEmail: string;
    loginCloud: string;

    constructor(
        language: NxLanguageProviderService,
        configService: NxConfigService,
        @Inject(WINDOW) private window: Window,
        @Inject(ViewContainerRef) viewContainerRef,
        private route: ActivatedRoute,
        private router: Router,
        private applyService: NxApplyService,
        private pageService: NxPageService,
        private dialogs: NxDialogsService,
        private processService: NxProcessService,
        private uriService: NxUriService,
        private toastService: NxToastService,
        location: Location
    ) {
        this.LANG = language.translations;
        this.CONFIG = configService.getConfig();
    }

    ngOnInit(): void {
        this.loginCloud = NxLanguageProviderService.translate(
            this.LANG.authorize.email.loginCloud,
            { cloudName: this.CONFIG.cloudName }
        );
        this.initProcesses();
    //     this.routeParamsSubscription = this.route
    //         .params
    //         .subscribe(params => {
    //             if (params.userId) {
    //                 this.paramUser = params.userId;
    //                 if (this.paramUser.indexOf('?') > -1) {
    //                     this.paramUser = this.paramUser.substring(0, this.paramUser.indexOf('?'));
    //                 }
    //                 this.menuService.detail = this.paramUser;
    //                 this.setUser();
    //             }
    //         });
    }

    ngOnDestroy(): void {
    //     this.routeParamsSubscription.unsubscribe();
    //     this.systemSubscription.unsubscribe();
    //     if (this.userSubscription) {
    //         this.userSubscription.unsubscribe();
    //     }
    }

    initProcesses() {
        this.passwordProcess = this.processService.createProcess(async() => {
            return Promise.resolve();
        }, { ignoreError: true });
    }
}
