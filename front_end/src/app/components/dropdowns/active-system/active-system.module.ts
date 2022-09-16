import { NgModule } from '@angular/core';

import { ComponentsCoreModule } from '@components/components-core.module';

import { NxActiveSystemDropdown } from './active-system.component';

@NgModule({
    imports: [
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
