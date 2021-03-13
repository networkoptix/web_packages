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
import { NxSearchService }           from './search.service';
import { NxAppSourceService }        from './nx-app-source.service';
import { NxSwCacheService }          from '@services/sw-cache.service';

@NgModule({
    imports: [
        CommonModule
    ],
    declarations: [
    ],
    providers: [
        NxAppSourceService,
        NxAppStateService,
        NxApplyService,
        NxLanguageProviderService,
        NxConfigService,
        NxUtilsService,
        NxPageService,
        NxSystemsService,
        NxAccountService,
        NxSearchService,
        NxUrlProtocolService,
        NxHeaderService,
        NxScrollMechanicsService,
        NxSwCacheService
    ],
    exports: []
})
export class ServiceModule {
}
