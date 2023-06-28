import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { AngularSvgIconModule } from 'angular-svg-icon';

import { PipesModule } from '@app/pipes/pipes.module';
import { NxAlertBlockComponent } from '@components/content-block/alert/block.component';
import { NxContentBlockComponent } from '@components/content-block/content-block.component';
import { NxContentBlockSectionComponent } from '@components/content-block/section/section.component';
import { NxGenericDropdownModule } from '@components/dropdowns/generic/dropdown.module';
import { NxThreeDotDropdown } from '@components/dropdowns/three-dot/three-dot.component';
import { EditableModule } from '@components/editable/editable.module';
import { NxInfoBlockComponent } from '@components/info-block/info-block.component';
import { NxNumericComponent } from '@components/numeric-input/numeric.component';
import { OpenClientSectionPlaceholderModule } from '@components/placeholders/open-client-section/open-client-section.module';
import { NxPagePlaceholderComponent } from '@components/placeholders/page/page-placeholder.component';
import { NxPreLoaderComponent } from '@components/placeholders/pre-loader/pre-loader.component';
import { NxRadioComponent } from '@components/radio/radio.component';
import { NxSwitchComponent } from '@components/switch/switch.component';
import { DirectivesModule } from '@directives/directives.module';
import { NxImageComponent } from '@pages/health/table-components/image/image.component';

import { NxCamerasComponent } from './cameras.component';
import { NxMotionDetectionOverlay } from './motion-detection-overlay/motion-detection-overlay.component';
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
        NxContentBlockComponent,
        NxContentBlockSectionComponent,
        DirectivesModule,
        EditableModule,
        NxInfoBlockComponent,
        NxGenericDropdownModule,
        NxImageComponent,
        NxNumericComponent,
        OpenClientSectionPlaceholderModule,
        NxPagePlaceholderComponent,
        PipesModule,
        NxPreLoaderComponent,
        NxRadioComponent,
        NxSwitchComponent,
        NxThreeDotDropdown,
    ],
    providers: [],
    declarations: [NxCamerasComponent, NxMotionDetectionOverlay, NxRecordingSettingsComponent],
    bootstrap: [],
    exports: [NxCamerasComponent],
})
export class NxCamerasModule {}
