import { OverlayModule } from '@angular/cdk/overlay';
import { NgModule } from '@angular/core';
import { AngularSvgIconModule } from 'angular-svg-icon';

import { NxAddSvgSrc } from './add-data.directive';
import { FeatureFlagDirective } from './feature.directive';
import { NxArrowNavDirective } from './nx-arrow-nav';
import { NxClickElsewhereDirective } from './nx-click-elsewhere';
import { NxEditableDirective } from './nx-editable.directive';
import { NxFocusMeDirective } from './nx-focus-me';
import { HighlightPipe } from './nx-highlight-text';
import { NxIntersectionObserver } from './nx-intersection.directive';
import { NxMatchHeightDirective } from './nx-match-height.directive';
import { NxProjectedCodeBlock } from './nx-projected-code-block.directive';
import { NxProjectedLinkHandler } from './nx-projected-link-handler.directive';
import { NxResizeObserver } from './nx-resize.directive';
import { NxScrollHelperDirective } from './nx-scroll-helper';
import { NxScrollMechanicsDirective } from './nx-scroll-mechanics';
import { NxTooltipDirective } from './nx-tooltip.directive';
import { NxUrlValidatorDirective } from './nx-url-validator';

@NgModule({
    imports: [
        AngularSvgIconModule.forRoot(),
        OverlayModule
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
        NxAddSvgSrc,
        NxIntersectionObserver,
        NxProjectedLinkHandler,
        NxProjectedCodeBlock,
        NxTooltipDirective,
        NxMatchHeightDirective,
        FeatureFlagDirective
    ],
    exports: [
        NxArrowNavDirective,
        NxClickElsewhereDirective,
        NxFocusMeDirective,
        HighlightPipe,
        NxScrollHelperDirective,
        NxScrollMechanicsDirective,
        NxUrlValidatorDirective,
        NxEditableDirective,
        NxResizeObserver,
        NxAddSvgSrc,
        NxIntersectionObserver,
        NxProjectedLinkHandler,
        NxProjectedCodeBlock,
        NxTooltipDirective,
        NxMatchHeightDirective,
        FeatureFlagDirective
    ]
})
export class DirectivesModule {
}
