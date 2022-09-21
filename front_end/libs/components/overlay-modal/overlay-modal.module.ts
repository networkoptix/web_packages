import { NgModule } from '@angular/core';

import { ComponentsCoreModule } from '@components/components-core.module';

import { NxOverlayModalComponent } from './overlay-modal.component';

@NgModule({
    imports: [
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
