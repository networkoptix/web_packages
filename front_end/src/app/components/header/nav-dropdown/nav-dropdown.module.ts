import { NgModule } from '@angular/core';
import { AngularSvgIconModule } from 'angular-svg-icon';

import { ComponentsCoreModule } from '@components/components-core.module';

import { NxNavDropdownComponent } from './nav-dropdown.component';

@NgModule({
    imports: [
        AngularSvgIconModule.forRoot(),
        ComponentsCoreModule,
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
