import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { AngularSvgIconModule } from 'angular-svg-icon';

import { NxSearchHighlightModule } from '@components/search-highlight/search-highlight.module';
import { DirectivesModule } from '@directives/directives.module';

import { NxSearchableDropdown } from './searchable.component';

@NgModule({
    imports: [
        CommonModule,
        AngularSvgIconModule,
        DirectivesModule,
        NxSearchHighlightModule,
    ],
    declarations: [
        NxSearchableDropdown
    ],
    providers: [
        NxSearchableDropdown
    ],
    exports: [
        NxSearchableDropdown
    ]
})

export class SearchableModule {}
