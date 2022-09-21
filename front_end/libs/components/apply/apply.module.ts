import { NgModule } from '@angular/core';

import { ComponentsCoreModule } from '@components/components-core.module';
import { ProcessButtonModule } from '@components/process-button/process-button.module';
import { ProcessCancelButtonModule } from '@components/process-cancel-Button/process-cancel-Button.module';

import { NxApplyComponent } from './apply.component';

@NgModule({
    imports: [
        ComponentsCoreModule,
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
