import { NgModule } from '@angular/core';

import { CheckboxModule } from '@components/checkbox/checkbox.module';
import { ComponentsCoreModule } from '@components/components-core.module';

import { NxAdvancedFilterComponent } from './advanced-filter.component';

@NgModule({
    imports: [
        ComponentsCoreModule,
        CheckboxModule,
    ],
    declarations: [
        NxAdvancedFilterComponent
    ],
    providers: [
        NxAdvancedFilterComponent
    ],
    exports: [
        NxAdvancedFilterComponent
    ]
})

export class AdvancedFilterModule {}
