import { NgModule } from '@angular/core';
import { AngularSvgIconModule } from 'angular-svg-icon';

import { ComponentsCoreModule } from '@components/components-core.module';

import { NxSystemTileComponent } from './system-tile.component';

@NgModule({
    imports: [
        AngularSvgIconModule.forRoot(),
        ComponentsCoreModule,
    ],
    declarations: [
        NxSystemTileComponent
    ],
    providers: [
        NxSystemTileComponent
    ],
    exports: [
        NxSystemTileComponent
    ]
})

export class SystemTileModule {}
