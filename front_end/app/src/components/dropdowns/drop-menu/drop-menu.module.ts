import { NgModule } from '@angular/core';

import { ComponentsCoreModule } from '@components/components-core.module';
import { SharedComponentsModule } from '@components/shared-components.module';

import { AdditionalSystemsTileModule } from './additional-systems-tile/additional-systems-tile.module';
import { NxDropMenu } from './drop-menu.component';
import { NavigationTileModule } from './navigation-tile/navigation-tile.module';
import { SystemTileModule } from './system-tile/system-tile.module';

@NgModule({
    imports: [
        AdditionalSystemsTileModule,
        SharedComponentsModule,
        ComponentsCoreModule,
        NavigationTileModule,
        SystemTileModule,
    ],
    declarations: [
        NxDropMenu
    ],
    providers: [
        NxDropMenu
    ],
    exports: [
        NxDropMenu
    ]
})

export class DropMenuModule {}
