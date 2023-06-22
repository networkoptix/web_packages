import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { AngularSvgIconModule } from 'angular-svg-icon';

import { NxSystemTileComponent } from './system-tile.component';

@NgModule({
    imports: [CommonModule, AngularSvgIconModule],
    declarations: [NxSystemTileComponent],
    providers: [NxSystemTileComponent],
    exports: [NxSystemTileComponent],
})
export class SystemTileModule {}
