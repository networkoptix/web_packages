import { NgModule }                  from '@angular/core';
import { CommonModule }              from '@angular/common';
import { downgradeInjectable }       from '@angular/upgrade/static';

import { NxLanguageProviderService } from './nx-language-provider';
import { NxConfigService }           from './nx-config';
import { NxAppStateService }         from './nx-app-state.service';
import { NxUtilsService }            from './utils.service';
import { NxPageService }             from './page.service';
import { NxRegisterService }         from './register.service';
import { NxSystemsService }          from './systems.service';
import { NxAccountService }          from './account.service';
import { NxUrlProtocolService }      from './url-protocol.service';
import { NxApplyService }            from './apply.service';

@NgModule({
    imports        : [
        CommonModule,
    ],
    declarations   : [
    ],
    entryComponents: [
    ],
    providers      : [
        NxAppStateService,
        NxApplyService,
        NxLanguageProviderService,
        NxConfigService,
        NxUtilsService,
        NxPageService,
        NxRegisterService,
        NxSystemsService,
        NxAccountService,
        NxUrlProtocolService,
    ],
    exports        : []
})
export class ServiceModule {
}

declare var angular: angular.IAngularStatic;
angular
    .module('cloudApp.services')
    .service('nxLanguageService', downgradeInjectable(NxLanguageProviderService))
    .service('nxConfigService', downgradeInjectable(NxConfigService))
    .service('nxPageService', downgradeInjectable(NxPageService))
    .service('nxAppStateService', downgradeInjectable(NxAppStateService))
    .service('nxAccountService', downgradeInjectable(NxAccountService))
    .service('nxUrlProtocolService', downgradeInjectable(NxUrlProtocolService))
    .service('nxSystemsService', downgradeInjectable(NxSystemsService));

