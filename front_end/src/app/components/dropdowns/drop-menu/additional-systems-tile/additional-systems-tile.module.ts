import { NgModule } from '@angular/core';

import { ComponentsCoreModule } from '@components/components-core.module';

import { NxAdditionalSystemsTileComponent } from './additional-systems-tile.component';

@NgModule({
    imports: [
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
