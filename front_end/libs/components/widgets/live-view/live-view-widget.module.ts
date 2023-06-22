import { CdkStepperModule } from '@angular/cdk/stepper';
import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { NxGenericDropdownModule } from '@components/dropdowns/generic/dropdown.module';
import { NumericModule } from '@components/numeric-input/numeric.module';
import { PreLoaderModule } from '@components/placeholders/pre-loader/pre-loader.module';
import { StepperModule } from '@components/stepper/stepper.module';

import { NxLiveViewWidgetComponent } from './live-view-widget.component';

@NgModule({
    imports: [
        CommonModule,
        FormsModule,
        CdkStepperModule,
        NumericModule,
        NxGenericDropdownModule,
        PreLoaderModule,
        StepperModule,
    ],
    declarations: [NxLiveViewWidgetComponent],
    providers: [NxLiveViewWidgetComponent],
    exports: [NxLiveViewWidgetComponent],
})
export class LiveViewWidgetModule {}
