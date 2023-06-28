import { CdkStepperModule } from '@angular/cdk/stepper';
import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { NxGenericDropdownModule } from '@components/dropdowns/generic/dropdown.module';
import { NxNumericComponent } from '@components/numeric-input/numeric.component';
import { NxPreLoaderComponent } from '@components/placeholders/pre-loader/pre-loader.component';
import { StepperModule } from '@components/stepper/stepper.module';

import { NxLiveViewWidgetComponent } from './live-view-widget.component';

@NgModule({
    imports: [
        CommonModule,
        FormsModule,
        CdkStepperModule,
        NxNumericComponent,
        NxGenericDropdownModule,
        NxPreLoaderComponent,
        StepperModule,
    ],
    declarations: [NxLiveViewWidgetComponent],
    providers: [NxLiveViewWidgetComponent],
    exports: [NxLiveViewWidgetComponent],
})
export class LiveViewWidgetModule {}
