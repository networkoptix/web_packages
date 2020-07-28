import { NgModule }                   from '@angular/core';
import { AngularSvgIconModule }       from 'angular-svg-icon';

import { NxArrowNavDirective }        from './nx-arrow-nav';
import { NxClickElsewhereDirective }  from './nx-click-elsewhere';
import { NxFocusMeDirective }         from './nx-focus-me';
import { HighlightPipe }              from './nx-highlight-text';
import { NxScrollHelperDirective }    from './nx-scroll-helper';
import { NxScrollMechanicsDirective } from './nx-scroll-mechanics';
import { NxUrlValidatorDirective }    from './nx-url-validator';
import { NxEditableDirective }        from './nx-editable.directive';
import { NxResizeObserver }           from './nx-resize.directive';
import { NxAddSvgSrc }                from './add-data.directive';

@NgModule({
    imports: [
        AngularSvgIconModule.forRoot()
    ],
    declarations: [
        NxArrowNavDirective,
        NxClickElsewhereDirective,
        NxFocusMeDirective,
        HighlightPipe,
        NxScrollHelperDirective,
        NxScrollMechanicsDirective,
        NxUrlValidatorDirective,
        NxEditableDirective,
        NxResizeObserver,
        NxAddSvgSrc
    ],
    entryComponents : [],
    exports         : [
        NxArrowNavDirective,
        NxClickElsewhereDirective,
        NxFocusMeDirective,
        HighlightPipe,
        NxScrollHelperDirective,
        NxScrollMechanicsDirective,
        NxUrlValidatorDirective,
        NxEditableDirective,
        NxResizeObserver,
        NxAddSvgSrc
    ]
})
export class DirectivesModule {
}
