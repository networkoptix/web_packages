import { CdkTableModule } from '@angular/cdk/table';
import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { AngularSvgIconModule } from 'angular-svg-icon';

import { AdvancedFilterModule } from '@components/advanced-filter/advanced-filter.module';
import { NxGenericDropdownModule } from '@components/dropdowns/generic/dropdown.module';
import { PaginatorModule } from '@components/paginator/paginator.module';
import { PreLoaderModule } from '@components/placeholders/pre-loader/pre-loader.module';
import { SearchModule } from '@components/search/search.module';
import { NxSearchHighlightModule } from '@components/search-highlight/search-highlight.module';
import { DirectivesModule } from '@directives/directives.module';
import { PipesModule } from '@pipes/pipes.module';

import { ContentBlockModule } from '../content-block/content-block.module';
import { ContentBlockSectionModule } from '../content-block/section/section.module';

import { NxConsoleTableComponent } from './console-table.component';

@NgModule({
    imports: [
        CommonModule,
        FormsModule,
        DirectivesModule,
        PipesModule,
        RouterModule,
        TranslateModule,
        CdkTableModule,
        AngularSvgIconModule,
        AdvancedFilterModule,
        ContentBlockSectionModule,
        ContentBlockModule,
        NxGenericDropdownModule,
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
