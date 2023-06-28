import { DragDropModule } from '@angular/cdk/drag-drop';
import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';

import { NxCheckboxComponent } from '@components/checkbox/checkbox.component';
import { NxGenericDropdownModule } from '@components/dropdowns/generic/dropdown.module';
import { NxPaginatorComponent } from '@components/paginator/paginator.component';
import { NxPreLoaderComponent } from '@components/placeholders/pre-loader/pre-loader.component';
import { NxSectionPlaceholderComponent } from '@components/placeholders/section/section-placeholder.component';
import { ResizeModule } from '@directives/resize/resize.module';

import { NxBaseTableComponent } from './table.component';

@NgModule({
    imports: [
        CommonModule,
        TranslateModule,
        DragDropModule,
        NxCheckboxComponent,
        NxGenericDropdownModule,
        NxPaginatorComponent,
        NxPreLoaderComponent,
        ResizeModule,
        NxSectionPlaceholderComponent,
    ],
    declarations: [NxBaseTableComponent],
    providers: [NxBaseTableComponent],
    exports: [NxBaseTableComponent],
})
export class NxBaseTableModule {}
