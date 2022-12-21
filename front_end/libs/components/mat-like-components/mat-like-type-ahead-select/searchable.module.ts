import { NgModule } from '@angular/core';
import { AngularSvgIconModule } from 'angular-svg-icon';

import { ComponentsCoreModule } from '@components/components-core.module';
import { NxSearchHighlightModule } from '@components/search-highlight/search-highlight.module';

import { NxMatLikeTypeAheadDropdown } from './searchable.component';

@NgModule({
    imports: [
        AngularSvgIconModule.forRoot(),
        ComponentsCoreModule,
        NxSearchHighlightModule,
    ],
    declarations: [
        NxMatLikeTypeAheadDropdown
    ],
    providers: [
        NxMatLikeTypeAheadDropdown
    ],
    exports: [
        NxMatLikeTypeAheadDropdown
    ]
})

export class NxMatLikeTypeAheadModule {}
