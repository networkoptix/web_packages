import { NgModule } from '@angular/core';
import { AngularSvgIconModule } from 'angular-svg-icon';

import { CheckboxModule } from '@components/checkbox/checkbox.module';
import { ComponentsCoreModule } from '@components/components-core.module';

import { NxMultiSelectDropdown } from './multi-select.component';

@NgModule({
    imports: [
        AngularSvgIconModule.forRoot(),
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
