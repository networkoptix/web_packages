import { NgModule }                  from '@angular/core';
import { CommonModule }              from '@angular/common';
import { NxLanguageProviderService } from './nx-language-provider';
import { NxConfigService }           from './nx-config';
import { NxAppStateService }         from './nx-app-state.service';
import { NxUtilsService }            from './utils.service';
import { NxPageService }             from './page.service';
import { NxSystemsService }          from './systems.service';
import { NxAccountService }          from './account.service';
import { NxUrlProtocolService }      from './url-protocol.service';
import { NxApplyService }            from './apply.service';
import { NxHeaderService }           from './nx-header.service';
import { NxScrollMechanicsService }  from './scroll-mechanics.service';
import { CloudAccount }              from './account.service/cloud';
import { LocalAccount }              from './account.service/local';
import { NxSearchService }           from './search.service';
import { NxAppSourceService }        from './nx-app-source.service';

@NgModule({
    imports: [
        CommonModule
    ],
    declarations : [],
    entryComponents : [],
    providers : [
        NxAppSourceService,
        NxAppStateService,
        NxApplyService,
        NxLanguageProviderService,
        NxConfigService,
        NxUtilsService,
        NxPageService,
        NxSystemsService,
        {
            provide  : NxAccountService,
            // TODO: Checking nxConfig.isLocal will probably be replaced with checking for a build flag
            useClass : NxConfigService.resolveLocalOrCloud(LocalAccount, CloudAccount)
        },
        NxSearchService,
        NxUrlProtocolService,
        NxHeaderService,
        NxScrollMechanicsService
    ],
    exports: []
})
export class ServiceModule {
}
