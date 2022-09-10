import { NgModule } from '@angular/core';

import { ComponentsCoreModule } from '@components/components-core.module';
import { SharedComponentsModule } from '@components/shared-components.module';

import { NxExternalVideoComponent } from './external-video.component';

@NgModule({
    imports: [
        SharedComponentsModule,
        ComponentsCoreModule,
    ],
    declarations: [
        NxExternalVideoComponent
    ],
    providers: [
        NxExternalVideoComponent
    ],
    exports: [
        NxExternalVideoComponent
    ]
})

export class ExternalVideoModule {}
