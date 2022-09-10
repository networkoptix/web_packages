import { NgModule } from '@angular/core';
import { AngularSvgIconModule } from 'angular-svg-icon';

import { ComponentsCoreModule } from '@components/components-core.module';
import { NxSearchHighlightModule } from '@components/search-highlight/search-highlight.module';
import { SharedComponentsModule } from '@components/shared-components.module';

import { NxSearchableDropdown } from './searchable.component';

@NgModule({
    imports: [
        AngularSvgIconModule.forRoot(),
        SharedComponentsModule,
        ComponentsCoreModule,
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
