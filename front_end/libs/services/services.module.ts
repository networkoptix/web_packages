import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';

import { NxSwCacheService } from '@services/sw-cache.service';
import { NxThemeService } from '@services/theme.service';

import { NxAccountService } from './account.service';
import { NxApplyService } from './apply.service';
import { NxDbService } from './db.service';
import { NxAppSourceService } from './nx-app-source.service';
import { NxAppStateService } from './nx-app-state.service';
import { NxConfigService } from './nx-config/nx-config.service';
import { NxHeaderService } from './nx-header.service';
import { NxLanguageProviderService } from './nx-language-provider';
import { NxPageService } from './page.service';
import { NxScrollMechanicsService } from './scroll-mechanics.service';
import { NxSearchService } from './search.service';
import { NxSystemsService } from './systems.service';
import { NxVmsClientService } from './vms-client.service';

@NgModule({
    imports: [CommonModule],
    declarations: [],
    providers: [
        NxAppSourceService,
        NxAppStateService,
        NxApplyService,
        NxLanguageProviderService,
        NxConfigService,
        NxPageService,
        NxSystemsService,
        NxAccountService,
        NxSearchService,
        NxVmsClientService,
        NxHeaderService,
        NxScrollMechanicsService,
        NxSwCacheService,
        NxThemeService,
        NxDbService,
    ],
    exports: [],
})
export class ServiceModule {}
