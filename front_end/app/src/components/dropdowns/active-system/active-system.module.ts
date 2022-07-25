import { NgModule } from '@angular/core';

import { ComponentsCoreModule } from '@components/components-core.module';
import { SharedComponentsModule } from '@components/shared-components.module';

import { NxActiveSystemDropdown } from './active-system.component';

@NgModule({
    imports: [
        SharedComponentsModule,
        ComponentsCoreModule,
    ],
    declarations: [
        NxActiveSystemDropdown
    ],
    providers: [
        NxActiveSystemDropdown
    ],
    exports: [
        NxActiveSystemDropdown
    ]
})

export class ActiveSystemModule {}
