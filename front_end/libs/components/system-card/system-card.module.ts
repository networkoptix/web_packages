import { NgModule } from '@angular/core';
import { AngularSvgIconModule } from 'angular-svg-icon';

import { ComponentsCoreModule } from '@components/components-core.module';
import { ClientButtonModule } from '@components/open-client-button/client-button.module';
import { NxSearchHighlightModule } from '@components/search-highlight/search-highlight.module';
import { TagModule } from '@components/tag/tag.module';

import { SystemCardComponent } from './system-card.component';

@NgModule({
    imports: [
        AngularSvgIconModule.forRoot(),
        ComponentsCoreModule,
        ClientButtonModule,
        TagModule,
        NxSearchHighlightModule,
    ],
    declarations: [
        SystemCardComponent,
    ],
    providers: [
        SystemCardComponent,
    ],
    exports: [
        SystemCardComponent,
    ]
})
export class SystemCardModule {}
