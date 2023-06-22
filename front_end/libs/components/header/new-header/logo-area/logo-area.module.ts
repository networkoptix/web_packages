import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { AngularSvgIconModule } from 'angular-svg-icon';

import { DirectivesModule } from '@directives/directives.module';

import { NxHeaderLogoAreaComponent } from './logo-area.component';

@NgModule({
    imports: [CommonModule, RouterModule, AngularSvgIconModule, DirectivesModule],
    declarations: [NxHeaderLogoAreaComponent],
    providers: [NxHeaderLogoAreaComponent],
    exports: [NxHeaderLogoAreaComponent],
})
export class HeaderLogoAreaModule {}
