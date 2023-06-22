import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { AngularSvgIconModule } from 'angular-svg-icon';

import { NxPlayerPlaceholderComponent } from './player-placeholder.component';

@NgModule({
    imports: [CommonModule, RouterModule, AngularSvgIconModule],
    declarations: [NxPlayerPlaceholderComponent],
    providers: [NxPlayerPlaceholderComponent],
    exports: [NxPlayerPlaceholderComponent],
})
export class PlayerPlaceholderModule {}
