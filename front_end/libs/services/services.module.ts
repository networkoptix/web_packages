import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { DBConfig, NgxIndexedDBModule } from 'ngx-indexed-db';

import { NxApplyV3Service } from '@components/forms/apply-v3/apply-v3.service';
import { NxSwCacheService } from '@services/sw-cache.service';
import { NxThemeService } from '@services/theme.service';

import { NxAccountService } from './account.service';
import { NxApplyService } from './apply.service';
import { NxDateTimeFormatService } from './datetime-format.service';
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

const dbConfig: DBConfig = {
    name: 'genericUnencryptedCache',
    version: 3,
    objectStoresMeta: [
        {
            store: 'requestCache',
            storeConfig: { keyPath: 'key', autoIncrement: false },
            storeSchema: [{ name: 'value', keypath: 'value', options: { unique: false } }],
        },
        {
            store: 'menuCache',
            storeConfig: { keyPath: 'key', autoIncrement: false },
            storeSchema: [{ name: 'value', keypath: 'value', options: { unique: false } }],
        },
        {
            store: 'layoutCache',
            storeConfig: { keyPath: 'key', autoIncrement: false },
            storeSchema: [{ name: 'value', keypath: 'value', options: { unique: false } }],
        },
        {
            store: 'jsons',
            storeConfig: { keyPath: 'key', autoIncrement: false },
            storeSchema: [
                { name: 'json', keypath: 'json', options: { unique: false } },
                { name: 'markdown', keypath: 'markdown', options: { unique: false } },
                { name: 'version', keypath: 'version', options: { unique: false } },
            ],
        },
    ],
};

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
        NxVmsClientService,
        NxHeaderService,
        NxScrollMechanicsService,
        NxSwCacheService,
        NxThemeService,
    ],
    exports: [],
})
export class ServiceModule {}
