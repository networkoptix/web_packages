import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { NgxIndexedDBModule } from 'ngx-indexed-db';

import { NxApplyV3Service } from '@components/forms/apply-v3/apply-v3.service';
import { NxSwCacheService } from '@services/sw-cache.service';
import { NxThemeService } from '@services/theme.service';

import { NxAccountService } from './account.service';
import { NxApplyService } from './apply.service';
import { NxDateTimeFormatService } from './datetime-format.service';
import { dbConfig } from './index_db_config';
import { NxAppSourceService } from './nx-app-source.service';
import { NxAppStateService } from './nx-app-state.service';
import { NxConfigService } from './nx-config/nx-config.service';
import { NxHeaderService } from './nx-header.service';
import { NxLanguageProviderService } from './nx-language-provider';
import { NxPageService } from './page.service';
import { NxScrollMechanicsService } from './scroll-mechanics.service';
import { NxSearchService } from './search.service';
import { NxSystemsService } from './systems.service';
import { NxUrlProtocolService } from './url-protocol.service';

@NgModule({
    imports: [CommonModule, NgxIndexedDBModule.forRoot(dbConfig)],
    declarations: [],
    providers: [
        NxAppSourceService,
        NxAppStateService,
        NxApplyService,
        NxApplyV3Service,
        NxLanguageProviderService,
        NxDateTimeFormatService,
        NxConfigService,
        NxPageService,
        NxSystemsService,
        NxAccountService,
        NxSearchService,
        NxUrlProtocolService,
        NxHeaderService,
        NxScrollMechanicsService,
        NxSwCacheService,
        NxThemeService,
    ],
    exports: [],
})
export class ServiceModule {}
