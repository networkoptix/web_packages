import { CdkStepperModule } from '@angular/cdk/stepper';
import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { CheckboxModule } from '@components/checkbox/checkbox.module';
import { StepperModule } from '@components/stepper/stepper.module';
import { SystemListModule } from '@components/systems-list/list.module';
import { PipesModule } from '@pipes/pipes.module';

import { NxSystemsListWidgetComponent } from './systems-list-widget.component';

@NgModule({
    imports: [
        CommonModule,
        FormsModule,
        CdkStepperModule,
        CheckboxModule,
        PipesModule,
        StepperModule,
        SystemListModule,
    ],
    declarations: [
        NxSystemsListWidgetComponent
    ],
    providers: [
        NxSystemsListWidgetComponent
    ],
    exports: [
        NxSystemsListWidgetComponent
    ]
})

export class SystemListWidgetModule {}
