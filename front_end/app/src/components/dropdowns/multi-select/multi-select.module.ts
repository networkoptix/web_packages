import { NgModule } from '@angular/core';

import { CheckboxModule } from '@components/checkbox/checkbox.module';
import { ComponentsCoreModule } from '@components/components-core.module';
import { SharedComponentsModule } from '@components/shared-components.module';

import { NxMultiSelectDropdown } from './multi-select.component';

@NgModule({
    imports: [
        SharedComponentsModule,
        ComponentsCoreModule,
        CheckboxModule,
    ],
    declarations: [
        NxMultiSelectDropdown
    ],
    providers: [
        NxMultiSelectDropdown
    ],
    exports: [
        NxMultiSelectDropdown
    ]
})

export class MultiSelectModule {}
