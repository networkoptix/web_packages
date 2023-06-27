import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { AngularSvgIconModule } from 'angular-svg-icon';

import { PipesModule } from '@app/pipes/pipes.module';
import { NxAlertBlockComponent } from '@components/content-block/alert/block.component';
import { NxContentBlockComponent } from '@components/content-block/content-block.component';
import { NxContentBlockSectionComponent } from '@components/content-block/section/section.component';
import { NxGenericDropdownModule } from '@components/dropdowns/generic/dropdown.module';
import { EditableModule } from '@components/editable/editable.module';
import { NxInfoBlockComponent } from '@components/info-block/info-block.component';
import { NumericModule } from '@components/numeric-input/numeric.module';
import { PagePlaceHolderModule } from '@components/placeholders/page/page-placeholder.module';
import { PreLoaderModule } from '@components/placeholders/pre-loader/pre-loader.module';
import { SectionPlaceholderModule } from '@components/placeholders/section/section-placeholder.module';
import { ProcessButtonModule } from '@components/process-button/process-button.module';
import { DirectivesModule } from '@directives/directives.module';

import { NxCloudStorageModule } from '../cloud-storage/cloud-storage.module';

import { NxServerLoggerComponent } from './logger/logger.component';
import { NxSystemServersComponent } from './servers.component';
import { NxSystemStandardServerComponent } from './standard/server-standard.component';
import { NxSystemStorageComponent } from './storage/server-storage-standard.component';
import { NxSystemAdvancedStorageComponent } from './storage-advanced/server-storage-adv.component';
import { NxStorageSizeComponent } from './storage-advanced/size/size.component';

@NgModule({
    imports: [
        CommonModule,
        FormsModule,
        RouterModule,
        TranslateModule,
        AngularSvgIconModule,
        NxAlertBlockComponent,
        NxContentBlockComponent,
        NxContentBlockSectionComponent,
        DirectivesModule,
        EditableModule,
        NxInfoBlockComponent,
        NxCloudStorageModule,
        NxGenericDropdownModule,
        NumericModule,
        PagePlaceHolderModule,
        PipesModule,
        PreLoaderModule,
        ProcessButtonModule,
        SectionPlaceholderModule,
    ],
    providers: [],
    declarations: [
        NxSystemServersComponent,
        NxSystemStandardServerComponent,
        NxServerLoggerComponent,
        NxSystemStorageComponent,
        NxSystemAdvancedStorageComponent,
        NxStorageSizeComponent,
    ],
    bootstrap: [],
    exports: [NxSystemServersComponent],
})
export class NxSystemServersModule {}
