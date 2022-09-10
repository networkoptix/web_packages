import { NgModule } from '@angular/core';

import { ComponentsCoreModule } from '@components/components-core.module';
import { SharedComponentsModule } from '@components/shared-components.module';

import { NxProcessCancelButtonComponent } from './process-cancel-button.component';

@NgModule({
    imports: [
        SharedComponentsModule,
        ComponentsCoreModule,
    ],
    declarations: [
        NxProcessCancelButtonComponent
    ],
    providers: [
        NxProcessCancelButtonComponent
    ],
    exports: [
        NxProcessCancelButtonComponent
    ]
})

export class ProcessCancelButtonModule {}
