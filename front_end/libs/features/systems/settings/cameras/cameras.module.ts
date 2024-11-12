import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { AngularSvgIconModule } from 'angular-svg-icon';

import { NxCheckboxComponent } from '@components/checkbox/checkbox.component';
import { NxAlertBlockComponent } from '@components/content-block/alert/block.component';
import { NxContentBlockComponent } from '@components/content-block/content-block.component';
import { NxContentBlockSectionComponent } from '@components/content-block/section/section.component';
import { NxGenericDropdownModule } from '@components/dropdowns/generic/dropdown.module';
import { NxThreeDotDropdown } from '@components/dropdowns/three-dot/three-dot.component';
import { EditableModule } from '@components/editable/editable.module';
import { NxInfoBlockComponent } from '@components/info-block/info-block.component';
import { NxNumericComponent } from '@components/numeric-input/numeric.component';
import { NxPagePlaceholderGenericComponent } from '@components/placeholders/generic-page-placeholder.component';
import { NxPagePlaceholderNoSettingsComponent } from '@components/placeholders/no-settings/no-settings-page-placeholder.component';
import { NxOpenClientSectionPlaceholderComponent } from '@components/placeholders/open-client-section/open-client-section.component';
import { NxPreLoaderComponent } from '@components/placeholders/pre-loader/pre-loader.component';
import { NxRadioComponent } from '@components/radio/radio.component';
import { NxSelectV2Module } from '@components/select-v2/select-v2.module';
import { NxSwitchComponent } from '@components/switch/switch.component';
import { NxAddSvgSrcDirective } from '@directives/add-data.directive';
import { NxResizeObserver } from '@directives/resize/nx-resize.directive';
import { NxImageComponent } from '@pages/health/table-components/image/image.component';
import { PipesModule } from '@pipes/pipes.module';

import { NxCamerasComponent } from './cameras.component';
import { NxMotionDetectionOverlay } from './motion-detection-settings/motion-detection-overlay/motion-detection-overlay.component';
import { NxMotionDetectionSettingsComponent } from './motion-detection-settings/motion-detection-settings.component';
import { NxNoCamerasComponent } from './no-cameras-settings/no-cameras.component';
import { NxRecordingSettingsComponent } from './recording-settings/recording-settings.component';

@NgModule({
    imports: [
        CommonModule,
        FormsModule,
        ReactiveFormsModule,
        RouterModule,
        TranslateModule,
        AngularSvgIconModule,
        NxAlertBlockComponent,
        NxCheckboxComponent,
        NxContentBlockComponent,
        NxContentBlockSectionComponent,
        EditableModule,
        NxInfoBlockComponent,
        NxGenericDropdownModule,
        NxImageComponent,
        NxNumericComponent,
        NxPagePlaceholderNoSettingsComponent,
        PipesModule,
        NxPreLoaderComponent,
        NxRadioComponent,
        NxSwitchComponent,
        NxThreeDotDropdown,
        NxCheckboxComponent,
        NxResizeObserver,
        NxAddSvgSrcDirective,
        NxSelectV2Module,
        NxOpenClientSectionPlaceholderComponent,
        NxPagePlaceholderGenericComponent,
    ],
    providers: [],
    declarations: [
        NxCamerasComponent,
        NxMotionDetectionOverlay,
        NxRecordingSettingsComponent,
        NxMotionDetectionSettingsComponent,
        NxNoCamerasComponent,
    ],
    bootstrap: [],
    exports: [NxCamerasComponent],
})
export class NxCamerasModule {}
