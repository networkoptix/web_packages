import { NgModule } from '@angular/core';

import { ComponentsCoreModule } from '@components/components-core.module';
import { ProcessButtonModule } from '@components/process-button/process-button.module';
import { ProcessCancelButtonModule } from '@components/process-cancel-Button/process-cancel-Button.module';
import { SharedComponentsModule } from '@components/shared-components.module';

import { NxApplyComponent } from './apply.component';

@NgModule({
    imports: [
        ComponentsCoreModule,
        SharedComponentsModule,
        ProcessButtonModule,
        ProcessCancelButtonModule,
    ],
    declarations: [
        NxApplyComponent
    ],
    providers: [
        NxApplyComponent
    ],
    exports: [
        NxApplyComponent
    ]
})

export class ApplyModule {}
