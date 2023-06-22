import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';

import { DirectivesModule } from '@directives/directives.module';

import { AdditionalSystemsTileModule } from './additional-systems-tile/additional-systems-tile.module';
import { NxDropMenu } from './drop-menu.component';
import { NavigationTileModule } from './navigation-tile/navigation-tile.module';
import { SystemTileModule } from './system-tile/system-tile.module';

@NgModule({
    imports: [
        CommonModule,
        AdditionalSystemsTileModule,
        DirectivesModule,
        NavigationTileModule,
        SystemTileModule,
    ],
    declarations: [NxDropMenu],
    providers: [NxDropMenu],
    exports: [NxDropMenu],
})
export class DropMenuModule {}
