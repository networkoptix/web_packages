import { NgModule } from '@angular/core';

import { ComponentsCoreModule } from '@components/components-core.module';
import { SharedComponentsModule } from '@components/shared-components.module';

import { NxStepperComponent } from './stepper.component';

@NgModule({
    imports: [
        SharedComponentsModule,
        ComponentsCoreModule,
    ],
    declarations: [
        NxStepperComponent
    ],
    providers: [
        NxStepperComponent
    ],
    exports: [
        NxStepperComponent
    ]
})

export class StepperModule {}
