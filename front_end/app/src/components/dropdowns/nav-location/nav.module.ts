import { NgModule } from '@angular/core';

import { ComponentsCoreModule } from '@components/components-core.module';
import { SharedComponentsModule } from '@components/shared-components.module';

import { NxNavLocationDropdown } from './nav.component';

@NgModule({
    imports: [
        SharedComponentsModule,
        ComponentsCoreModule,
    ],
    declarations: [
        NxNavLocationDropdown
    ],
    providers: [
        NxNavLocationDropdown
    ],
    exports: [
        NxNavLocationDropdown
    ]
})

export class NavModule {}
