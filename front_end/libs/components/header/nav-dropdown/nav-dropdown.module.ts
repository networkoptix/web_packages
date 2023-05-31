import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { AngularSvgIconModule } from 'angular-svg-icon';

import { DirectivesModule } from '@directives/directives.module';

import { NxNavDropdownComponent } from './nav-dropdown.component';

@NgModule({
    imports: [
        CommonModule,
        RouterModule,
        AngularSvgIconModule,
        DirectivesModule
    ],
    declarations: [
        NxNavDropdownComponent
    ],
    providers: [
        NxNavDropdownComponent
    ],
    exports: [
        NxNavDropdownComponent
    ]
})

export class NavDropdownModule {}
