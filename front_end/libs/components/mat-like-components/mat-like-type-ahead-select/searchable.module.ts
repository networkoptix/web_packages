import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { AngularSvgIconModule } from 'angular-svg-icon';

import { NxSearchHighlightModule } from '@components/search-highlight/search-highlight.module';
import { DirectivesModule } from '@directives/directives.module';

import { NxMatLikeTypeAheadDropdown } from './searchable.component';

@NgModule({
    imports: [CommonModule, AngularSvgIconModule, DirectivesModule, NxSearchHighlightModule],
    declarations: [NxMatLikeTypeAheadDropdown],
    providers: [NxMatLikeTypeAheadDropdown],
    exports: [NxMatLikeTypeAheadDropdown],
})
export class NxMatLikeTypeAheadModule {}
