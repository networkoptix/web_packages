import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';

import { NxStepperComponent } from './stepper.component';

@NgModule({
    imports: [
        CommonModule
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
