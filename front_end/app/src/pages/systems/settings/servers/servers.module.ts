import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { AngularSvgIconModule } from 'angular-svg-icon';

import { ComponentsModule } from '@components/components.module';
import { InfoBlockModule } from '@components/info-block/info-block.module';
import { PagePlaceHolderModule } from '@components/placeholders/page/page-placeholder.module';
import { SectionPlaceholderModule } from '@components/placeholders/section/section-placeholder.module';
import { DirectivesModule } from '@directives/directives.module';
import { PipesModule } from '@src/pipes/pipes.module';

import { NxCloudStorageModule } from '../cloud-storage/cloud-storage.module';

import { NxServerLoggerComponent } from './logger/logger.component';
import { NxSystemServersComponent } from './servers.component';
import {
    NxSystemStandardServerComponent
} from './standard/server-standard.component';
import {
    NxSystemAdvancedStorageComponent
} from './storage-advanced/server-storage-adv.component';
import { NxStorageSizeComponent } from './storage-advanced/size/size.component';
import {
    NxSystemStorageComponent
} from './storage/server-storage-standard.component';

@NgModule({
    imports: [
        CommonModule,
        RouterModule,
        FormsModule,
        TranslateModule,
        ComponentsModule,
        DirectivesModule,
        PipesModule,
        AngularSvgIconModule.forRoot(),
        NxCloudStorageModule,
        PagePlaceHolderModule,
        SectionPlaceholderModule,
        InfoBlockModule
    ],
    providers: [
    ],
    declarations: [
        NxSystemServersComponent,
        NxSystemStandardServerComponent,
        NxServerLoggerComponent,
        NxSystemStorageComponent,
        NxSystemAdvancedStorageComponent,
        NxStorageSizeComponent
    ],
    bootstrap: [
    ],
    exports: [
        NxSystemServersComponent
    ]
})
export class NxSystemServersModule {
}
