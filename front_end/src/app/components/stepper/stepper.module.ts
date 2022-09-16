import { NgModule } from '@angular/core';

import { ComponentsCoreModule } from '@components/components-core.module';

import { NxStepperComponent } from './stepper.component';

@NgModule({
    imports: [
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
