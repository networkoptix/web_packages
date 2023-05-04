import { DragDropModule } from '@angular/cdk/drag-drop';
import { NgModule } from '@angular/core';

import { CheckboxModule } from '@components/checkbox/checkbox.module';
import { ComponentsCommonModule } from '@components/components-common.module';
import { ComponentsCoreModule } from '@components/components-core.module';
import { PaginatorModule } from '@components/paginator/paginator.module';
import { SectionPlaceholderModule } from '@components/placeholders/section/section-placeholder.module';

import { NxBaseTableComponent } from './table.component';

@NgModule({
    imports: [
        ComponentsCoreModule,
        ComponentsCommonModule,
        CheckboxModule,
        PaginatorModule,
        DragDropModule,
        SectionPlaceholderModule,
    ],
    declarations: [
        NxBaseTableComponent,
    ],
    providers: [
        NxBaseTableComponent
    ],
    exports: [
        NxBaseTableComponent
    ]
})

export class NxBaseTableModule { }
