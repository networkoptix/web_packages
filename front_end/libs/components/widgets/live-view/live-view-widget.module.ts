import { NgModule } from '@angular/core';

import { ComponentsCoreModule } from '@components/components-core.module';
import { NumericModule } from '@components/numeric-input/numeric.module';
import { PreLoaderModule } from '@components/placeholders/pre-loader/pre-loader.module';
import { StepperModule } from '@components/stepper/stepper.module';

import { NxLiveViewWidgetComponent } from './live-view-widget.component';

@NgModule({
    imports: [
        ComponentsCoreModule,
        NumericModule,
        PreLoaderModule,
        StepperModule,
    ],
    declarations: [
        NxLiveViewWidgetComponent
    ],
    providers: [
        NxLiveViewWidgetComponent
    ],
    exports: [
        NxLiveViewWidgetComponent
    ]
})

export class LiveViewWidgetModule {}
