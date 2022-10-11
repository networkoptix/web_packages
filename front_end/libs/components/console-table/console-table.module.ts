import { NgModule } from '@angular/core';
import { AngularSvgIconModule } from 'angular-svg-icon';

import { AdvancedFilterModule } from '@components/advanced-filter/advanced-filter.module';
import { ComponentsCoreModule } from '@components/components-core.module';
import { PaginatorModule } from '@components/paginator/paginator.module';
import { PreLoaderModule } from '@components/placeholders/pre-loader/pre-loader.module';
import { NxSearchHighlightModule } from '@components/search-highlight/search-highlight.module';
import { SearchModule } from '@components/search/search.module';

import { ContentBlockModule } from '../content-block/content-block.module';
import { ContentBlockSectionModule } from '../content-block/section/section.module';

import { NxConsoleTableComponent } from './console-table.component';

@NgModule({
    imports: [
        AdvancedFilterModule,
        AngularSvgIconModule.forRoot(),
        ContentBlockSectionModule,
        ContentBlockModule,
        ComponentsCoreModule,
        PaginatorModule,
        PreLoaderModule,
        SearchModule,
        NxSearchHighlightModule,
    ],
    declarations: [
        NxConsoleTableComponent
    ],
    providers: [
        NxConsoleTableComponent
    ],
    exports: [
        NxConsoleTableComponent
    ]
})

export class ConsoleTableModule { }
