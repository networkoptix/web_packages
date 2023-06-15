import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { AngularSvgIconModule } from 'angular-svg-icon';

import { PipesModule } from '@app/pipes/pipes.module';
import { AlertBlockModule } from '@components/content-block/alert/block.module';
import { ContentBlockModule } from '@components/content-block/content-block.module';
import { ContentBlockSectionModule } from '@components/content-block/section/section.module';
import { NxGenericDropdownModule } from '@components/dropdowns/generic/dropdown.module';
import { EditableModule } from '@components/editable/editable.module';
import { InfoBlockModule } from '@components/info-block/info-block.module';
import { NumericModule } from '@components/numeric-input/numeric.module';
import { PagePlaceHolderModule } from '@components/placeholders/page/page-placeholder.module';
import { PreLoaderModule } from '@components/placeholders/pre-loader/pre-loader.module';
import { SectionPlaceholderModule } from '@components/placeholders/section/section-placeholder.module';
import { ProcessButtonModule } from '@components/process-button/process-button.module';
import { DirectivesModule } from '@directives/directives.module';

import { NxCloudStorageModule } from '../cloud-storage/cloud-storage.module';

import { NxServerLoggerComponent } from './logger/logger.component';
import { NxSystemServersComponent } from './servers.component';
import {
    NxSystemStandardServerComponent
} from './standard/server-standard.component';
import {
    NxSystemStorageComponent
} from './storage/server-storage-standard.component';
import {
    NxSystemAdvancedStorageComponent
} from './storage-advanced/server-storage-adv.component';
import { NxStorageSizeComponent } from './storage-advanced/size/size.component';

@NgModule({
    imports: [
        CommonModule,
        FormsModule,
        RouterModule,
        TranslateModule,
        AngularSvgIconModule,
        AlertBlockModule,
        ContentBlockModule,
        ContentBlockSectionModule,
        DirectivesModule,
        EditableModule,
        InfoBlockModule,
        NxCloudStorageModule,
        NxGenericDropdownModule,
        NumericModule,
        PagePlaceHolderModule,
        PipesModule,
        PreLoaderModule,
        ProcessButtonModule,
        SectionPlaceholderModule,
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
