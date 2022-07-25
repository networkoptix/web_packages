import { NgModule } from '@angular/core';

import { ComponentsCoreModule } from '@components/components-core.module';
import { ProcessButtonModule } from '@components/process-button/process-button.module';
import { SharedComponentsModule } from '@components/shared-components.module';

import { NxClientButtonComponent } from './client-button.component';

@NgModule({
    imports: [
        SharedComponentsModule,
        ComponentsCoreModule,
        ProcessButtonModule,
    ],
    declarations: [
        NxClientButtonComponent
    ],
    providers: [
        NxClientButtonComponent
    ],
    exports: [
        NxClientButtonComponent
    ]
})

export class ClientButtonModule {}
