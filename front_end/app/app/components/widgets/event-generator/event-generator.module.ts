import { NgModule } from '@angular/core';
import { AngularSvgIconModule } from 'angular-svg-icon';

import { ComponentsCoreModule } from '@components/components-core.module';
import { PreLoaderModule } from '@components/placeholders/pre-loader/pre-loader.module';
import { ProcessButtonModule } from '@components/process-button/process-button.module';
import { SharedComponentsModule } from '@components/shared-components.module';
import { StepperModule } from '@components/stepper/stepper.module';

import { NxEventGeneratorWidgetComponent } from './event-generator.component';

@NgModule({
    imports: [
        AngularSvgIconModule.forRoot(),
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
