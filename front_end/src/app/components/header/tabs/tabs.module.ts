import { NgModule } from '@angular/core';

import { ComponentsCoreModule } from '@components/components-core.module';
import { SharedComponentsModule } from '@components/shared-components.module';

import { NavDropdownModule } from '../nav-dropdown/nav-dropdown.module';

import { NxTabsComponent } from './tabs.component';

@NgModule({
    imports: [
        SharedComponentsModule,
        ComponentsCoreModule,
        NavDropdownModule,
    ],
    declarations: [
        NxTabsComponent
    ],
    providers: [
        NxTabsComponent
    ],
    exports: [
        NxTabsComponent
    ]
})

export class TabsModule {}
