import { NgModule } from '@angular/core';

import { NxArrowNavDirective }       from './nx-arrow-nav';
import { NxClickElsewhereDirective } from './nx-click-elsewhere';
import { NxFocusMeDirective }        from './nx-focus-me';
import { HighlightPipe }             from './nx-highlight-text';

@NgModule({
    imports: [],
    declarations: [
        NxArrowNavDirective,
        NxClickElsewhereDirective,
        NxFocusMeDirective,
        HighlightPipe,
    ],
    entryComponents: [],
    exports: [
        NxArrowNavDirective,
        NxClickElsewhereDirective,
        NxFocusMeDirective,
        HighlightPipe
    ]
})
export class DirectivesModule {
}
