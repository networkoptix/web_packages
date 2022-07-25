import { NgModule } from '@angular/core';

import { ComponentsCoreModule } from '@components/components-core.module';
import { SharedComponentsModule } from '@components/shared-components.module';

import { NxNavDropdownComponent } from './nav-dropdown.component';

@NgModule({
    imports: [
        SharedComponentsModule,
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
