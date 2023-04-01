import { NgModule } from '@angular/core';

import { CheckboxModule } from '@components/checkbox/checkbox.module';
import { ComponentsCoreModule } from '@components/components-core.module';
import { PaginatorModule } from '@components/paginator/paginator.module';

import { NxTableComponent } from './table.component';

@NgModule({
    imports: [
        ComponentsCoreModule,
        CheckboxModule,
        PaginatorModule
    ],
    declarations: [
        NxTableComponent
    ],
    providers: [
        NxTableComponent
    ],
    exports: [
        NxTableComponent
    ]
})

export class NxTableModule { }
