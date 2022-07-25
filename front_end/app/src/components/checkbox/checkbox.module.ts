import { NgModule } from '@angular/core';

import { ComponentsCoreModule } from '@components/components-core.module';

import { NxCheckboxComponent } from './checkbox.component';

@NgModule({
    imports: [
        ComponentsCoreModule,
    ],
    declarations: [
        NxCheckboxComponent
    ],
    providers: [
        NxCheckboxComponent
    ],
    exports: [
        NxCheckboxComponent
    ]
})

export class CheckboxModule {}
