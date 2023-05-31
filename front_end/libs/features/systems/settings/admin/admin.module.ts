import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { AngularSvgIconModule } from 'angular-svg-icon';

import { PipesModule } from '@app/pipes/pipes.module';
import { CheckboxModule } from '@components/checkbox/checkbox.module';
import { AlertBlockModule } from '@components/content-block/alert/block.module';
import { ContentBlockModule } from '@components/content-block/content-block.module';
import { ContentBlockSectionModule } from '@components/content-block/section/section.module';
import { NxGenericDropdownModule } from '@components/dropdowns/generic/dropdown.module';
import { EditableModule } from '@components/editable/editable.module';
import { NumericModule } from '@components/numeric-input/numeric.module';
import { ClientButtonModule } from '@components/open-client-button/client-button.module';
import { PreLoaderModule } from '@components/placeholders/pre-loader/pre-loader.module';
import { SectionPlaceholderModule } from '@components/placeholders/section/section-placeholder.module';
import { ProcessButtonModule } from '@components/process-button/process-button.module';
import { TagModule } from '@components/tag/tag.module';
import { DirectivesModule } from '@directives/directives.module';

import { NxSystemAdminComponent } from './admin.component';
import { NxSystemAdvancedAdminComponent } from './advanced/advanced.component';
import { NxSystemDetailedSettingComponent } from './detailedSetting/detailedSetting.component';
import { NxSystemStandardAdminComponent } from './standard/standard.component';

@NgModule({
    imports: [
        CommonModule,
        FormsModule,
        RouterModule,
        TranslateModule,
        AngularSvgIconModule,
        AlertBlockModule,
        CheckboxModule,
        ClientButtonModule,
        ContentBlockModule,
        ContentBlockSectionModule,
        DirectivesModule,
        EditableModule,
        NumericModule,
        NxGenericDropdownModule,
        PipesModule,
        PreLoaderModule,
        ProcessButtonModule,
        SectionPlaceholderModule,
        TagModule,
    ],
    providers: [
    ],
    declarations: [
        NxSystemAdminComponent,
        NxSystemStandardAdminComponent,
        NxSystemAdvancedAdminComponent,
        NxSystemDetailedSettingComponent
    ],
    bootstrap: [
    ],
    exports: [
        NxSystemAdminComponent
    ]
})
export class NxSystemAdminModule {
}
