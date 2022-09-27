import { NgModule } from '@angular/core';
import { AngularSvgIconModule } from 'angular-svg-icon';

import { ComponentsCoreModule } from '@components/components-core.module';
import { NxSearchHighlightModule } from '@components/search-highlight/search-highlight.module';
import { TagModule } from '@components/tag/tag.module';

import { NxSystemCardComponent } from './system-card.component';

@NgModule({
    imports: [
        AngularSvgIconModule.forRoot(),
        ComponentsCoreModule,
        TagModule,
        NxSearchHighlightModule,
    ],
    declarations: [
        NxSystemCardComponent,
    ],
    providers: [
        NxSystemCardComponent,
    ],
    exports: [
        NxSystemCardComponent,
    ]
})
export class NxSystemCardModule {}
