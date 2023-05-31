import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { AngularSvgIconModule } from 'angular-svg-icon';

import { NxNavigationTileComponent } from './navigation-tile.component';

@NgModule({
    imports: [
        CommonModule,
        RouterModule,
        AngularSvgIconModule
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
