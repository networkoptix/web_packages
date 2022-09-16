import { NgModule } from '@angular/core';

import { ComponentsCoreModule } from '@components/components-core.module';

import { NxNavLocationDropdown } from './nav.component';

@NgModule({
    imports: [
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
