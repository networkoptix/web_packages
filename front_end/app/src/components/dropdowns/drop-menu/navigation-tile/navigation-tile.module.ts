import { NgModule } from '@angular/core';
import { AngularSvgIconModule } from 'angular-svg-icon';

import { ComponentsCoreModule } from '@components/components-core.module';
import { SharedComponentsModule } from '@components/shared-components.module';

import { NxNavigationTileComponent } from './navigation-tile.component';

@NgModule({
    imports: [
        AngularSvgIconModule.forRoot(),
        SharedComponentsModule,
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
