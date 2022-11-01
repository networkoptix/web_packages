import { NgModule } from '@angular/core';

import { ComponentsCoreModule } from '@components/components-core.module';
import { SharedComponentsModule } from '@components/shared-components.module';

import { NxAdditionalSystemsTileComponent } from './additional-systems-tile.component';

@NgModule({
    imports: [
        SharedComponentsModule,
        ComponentsCoreModule,
    ],
    declarations: [
        NxAdditionalSystemsTileComponent
    ],
    providers: [
        NxAdditionalSystemsTileComponent
    ],
    exports: [
        NxAdditionalSystemsTileComponent
    ]
})

export class AdditionalSystemsTileModule {}
