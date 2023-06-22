import { DragDropModule } from '@angular/cdk/drag-drop';
import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';

import { CheckboxModule } from '@components/checkbox/checkbox.module';
import { NxGenericDropdownModule } from '@components/dropdowns/generic/dropdown.module';
import { PaginatorModule } from '@components/paginator/paginator.module';
import { PreLoaderModule } from '@components/placeholders/pre-loader/pre-loader.module';
import { SectionPlaceholderModule } from '@components/placeholders/section/section-placeholder.module';
import { ResizeModule } from '@directives/resize/resize.module';

import { NxBaseTableComponent } from './table.component';

@NgModule({
    imports: [
        CommonModule,
        TranslateModule,
        DragDropModule,
        CheckboxModule,
        NxGenericDropdownModule,
        PaginatorModule,
        PreLoaderModule,
        ResizeModule,
        SectionPlaceholderModule,
    ],
    declarations: [NxBaseTableComponent],
    providers: [NxBaseTableComponent],
    exports: [NxBaseTableComponent],
})
export class NxBaseTableModule {}
