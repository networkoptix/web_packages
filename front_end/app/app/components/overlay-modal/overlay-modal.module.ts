import { NgModule } from '@angular/core';

import { ComponentsCoreModule } from '@components/components-core.module';
import { SharedComponentsModule } from '@components/shared-components.module';

import { NxOverlayModalComponent } from './overlay-modal.component';

@NgModule({
    imports: [
        SharedComponentsModule,
        ComponentsCoreModule,
    ],
    declarations: [
        NxOverlayModalComponent
    ],
    providers: [
        NxOverlayModalComponent
    ],
    exports: [
        NxOverlayModalComponent
    ]
})

export class OverlayModalModule {}
