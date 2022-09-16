import { NgModule } from '@angular/core';

import { ComponentsCoreModule } from '@components/components-core.module';

import { NxExternalVideoComponent } from './external-video.component';

@NgModule({
    imports: [
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
