import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { AngularSvgIconModule } from 'angular-svg-icon';

import { PipesModule } from '@app/pipes/pipes.module';
import { CheckboxModule } from '@components/checkbox/checkbox.module';
import { AlertBlockModule } from '@components/content-block/alert/block.module';
import { ContentBlockModule } from '@components/content-block/content-block.module';
import { ContentBlockSectionModule } from '@components/content-block/section/section.module';
import { NxGenericDropdownModule } from '@components/dropdowns/generic/dropdown.module';
import { ThreeDotsModule } from '@components/dropdowns/three-dot/three-dots.module';
import { EditableModule } from '@components/editable/editable.module';
import { InfoBlockModule } from '@components/info-block/info-block.module';
import { NumericModule } from '@components/numeric-input/numeric.module';
import { OpenClientSectionPlaceholderModule } from '@components/placeholders/open-client-section/open-client-section.module';
import { PagePlaceHolderModule } from '@components/placeholders/page/page-placeholder.module';
import { PreLoaderModule } from '@components/placeholders/pre-loader/pre-loader.module';
import { RadioModule } from '@components/radio/radio.module';
import { SwitchModule } from '@components/switch/switch.module';
import { DirectivesModule } from '@directives/directives.module';
import { NxImageComponent } from '@pages/health/table-components/image/image.component';

import { NxCamerasComponent } from './cameras.component';
import {
    NxMotionDetectionOverlay
} from './motion-detection-overlay/motion-detection-overlay.component';
import { NxRecordingSettingsComponent } from './recording-settings/recording-settings.component';
@NgModule({
    imports: [
        CommonModule,
        FormsModule,
        ReactiveFormsModule,
        RouterModule,
        TranslateModule,
        AngularSvgIconModule,
        AlertBlockModule,
        CheckboxModule,
        ContentBlockModule,
        ContentBlockSectionModule,
        DirectivesModule,
        EditableModule,
        InfoBlockModule,
        NxGenericDropdownModule,
        NxImageComponent,
        NumericModule,
        OpenClientSectionPlaceholderModule,
        PagePlaceHolderModule,
        PipesModule,
        PreLoaderModule,
        RadioModule,
        SwitchModule,
        ThreeDotsModule,
    ],
    providers: [
    ],
    declarations: [
        NxCamerasComponent,
        NxMotionDetectionOverlay,
        NxRecordingSettingsComponent,
    ],
    bootstrap: [
    ],
    exports: [
        NxCamerasComponent
    ]
})
export class NxCamerasModule {
}
