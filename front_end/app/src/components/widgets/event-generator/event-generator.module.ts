import { NgModule } from '@angular/core';

import { ComponentsCoreModule } from '@components/components-core.module';
import { PreLoaderModule } from '@components/placeholders/pre-loader/pre-loader.module';
import { ProcessButtonModule } from '@components/process-button/process-button.module';
import { SharedComponentsModule } from '@components/shared-components.module';
import { StepperModule } from '@components/stepper/stepper.module';

import { NxEventGeneratorWidgetComponent } from './event-generator.component';

@NgModule({
    imports: [
        SharedComponentsModule,
        ComponentsCoreModule,
        PreLoaderModule,
        ProcessButtonModule,
        StepperModule,
    ],
    declarations: [
        NxEventGeneratorWidgetComponent
    ],
    providers: [
        NxEventGeneratorWidgetComponent
    ],
    exports: [
        NxEventGeneratorWidgetComponent
    ]
})

export class EventGeneratorModule {}
