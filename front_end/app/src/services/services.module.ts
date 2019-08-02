import { NgModule }                  from '@angular/core';
import { CommonModule }              from '@angular/common';
import { NxLanguageProviderService } from './nx-language-provider';
import { NxConfigService }           from './nx-config';
import { NxAppStateService }         from './nx-app-state.service';
import { downgradeInjectable }       from '@angular/upgrade/static';
import { NxUtilsService }            from './utils.service';
import { NxPageService }             from './page.service';
import { NxRegisterService }         from './register.service';
import { NxSystemsService } from './systems.service';


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
        NxLanguageProviderService,
        NxConfigService,
        NxUtilsService,
        NxPageService,
        NxRegisterService,
        NxSystemsService,
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
    .service('nxSystemsService', downgradeInjectable(NxSystemsService));

