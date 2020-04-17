import { NgModule }                   from '@angular/core';
import { NxArrowNavDirective }        from './nx-arrow-nav';
import { NxClickElsewhereDirective }  from './nx-click-elsewhere';
import { NxFocusMeDirective }         from './nx-focus-me';
import { HighlightPipe }              from './nx-highlight-text';
import { NxScrollHelperDirective }    from './nx-scroll-helper';
import { NxScrollMechanicsDirective } from './nx-scroll-mechanics';
import { NxUrlValidatorDirective }    from './nx-url-validator';
import { NxEditableDirective } from './nx-editable.directive';

@NgModule({
    imports     : [],
    declarations: [
        NxArrowNavDirective,
        NxClickElsewhereDirective,
        NxFocusMeDirective,
        HighlightPipe,
        NxScrollHelperDirective,
        NxScrollMechanicsDirective,
        NxUrlValidatorDirective,
        NxEditableDirective
    ],
    entryComponents: [],
    exports        : [
        NxArrowNavDirective,
        NxClickElsewhereDirective,
        NxFocusMeDirective,
        HighlightPipe,
        NxScrollHelperDirective,
        NxScrollMechanicsDirective,
        NxUrlValidatorDirective,
        NxEditableDirective
    ]
})
export class DirectivesModule {
}
