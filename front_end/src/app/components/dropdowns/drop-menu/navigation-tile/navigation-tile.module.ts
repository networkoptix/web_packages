import { NgModule } from '@angular/core';
import { AngularSvgIconModule } from 'angular-svg-icon';

import { ComponentsCoreModule } from '@components/components-core.module';

import { NxNavigationTileComponent } from './navigation-tile.component';

@NgModule({
    imports: [
        AngularSvgIconModule.forRoot(),
        ComponentsCoreModule,
    ],
    declarations: [
        NxNavigationTileComponent
    ],
    providers: [
        NxNavigationTileComponent
    ],
    exports: [
        NxNavigationTileComponent
    ]
})

export class NavigationTileModule {}
