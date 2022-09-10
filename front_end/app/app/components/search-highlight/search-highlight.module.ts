import { NgModule } from '@angular/core';

import { ComponentsCoreModule } from '@components/components-core.module';

import { NxSearchHighlightComponent } from './search-highlight.component';

@NgModule({
    imports: [
        ComponentsCoreModule,
    ],
    declarations: [
        NxSearchHighlightComponent,
    ],
    providers: [
        NxSearchHighlightComponent,
    ],
    exports: [
        NxSearchHighlightComponent,
    ]
})
export class NxSearchHighlightModule {}
