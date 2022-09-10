import { NgModule } from '@angular/core';

import { CheckboxModule } from '@components/checkbox/checkbox.module';
import { ComponentsCoreModule } from '@components/components-core.module';
import { SharedComponentsModule } from '@components/shared-components.module';
import { StepperModule } from '@components/stepper/stepper.module';
import { SystemListModule } from '@components/systems-list/list.module';

import { NxSystemsListWidgetComponent } from './systems-list-widget.component';

@NgModule({
    imports: [
        SharedComponentsModule,
        ComponentsCoreModule,
        CheckboxModule,
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
