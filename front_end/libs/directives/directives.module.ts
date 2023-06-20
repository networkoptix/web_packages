import { OverlayModule } from '@angular/cdk/overlay';
import { NgModule } from '@angular/core';
import { AngularSvgIconModule } from 'angular-svg-icon';

import { NxClickDoubleDirective } from '@directives/nx-single-double-click.directive';

import { NxAddSvgSrc } from './add-data.directive';
import { FeatureFlagDirective } from './feature.directive';
import { NxArrowNavDirective } from './nx-arrow-nav';
import { NxClickElsewhereDirective } from './nx-click-elsewhere';
import { NxFocusMeDirective } from './nx-focus-me';
import { NxIntersectionObserver } from './nx-intersection.directive';
import { NxMatchHeightDirective } from './nx-match-height.directive';
import { NxProjectedCodeBlock } from './nx-projected-code-block.directive';
import { NxProjectedLinkHandler } from './nx-projected-link-handler.directive';
import { NxScrollHelperDirective } from './nx-scroll-helper';
import { NxScrollMechanicsDirective } from './nx-scroll-mechanics';
import { NxTooltipDirective } from './nx-tooltip.directive';
import { NxTranslateOverrideDirective } from './nx-translate.directive';
import { NxUrlValidatorDirective } from './nx-url-validator';
import { ResizeModule } from './resize/resize.module';
import { RotateModule } from './rotate/rotate.module';

@NgModule({
    imports: [
        AngularSvgIconModule,
        OverlayModule,
        ResizeModule
    ],
    declarations: [
        NxArrowNavDirective,
        NxClickElsewhereDirective,
        NxFocusMeDirective,
        NxScrollHelperDirective,
        NxScrollMechanicsDirective,
        NxUrlValidatorDirective,
        NxAddSvgSrc,
        NxIntersectionObserver,
        NxProjectedLinkHandler,
        NxProjectedCodeBlock,
        NxTooltipDirective,
        NxMatchHeightDirective,
        FeatureFlagDirective,
        NxClickDoubleDirective,
        NxTranslateOverrideDirective
    ],
    exports: [
        NxArrowNavDirective,
        NxClickElsewhereDirective,
        NxFocusMeDirective,
        NxScrollHelperDirective,
        NxScrollMechanicsDirective,
        NxUrlValidatorDirective,
        NxAddSvgSrc,
        NxIntersectionObserver,
        NxProjectedLinkHandler,
        NxProjectedCodeBlock,
        NxTooltipDirective,
        NxMatchHeightDirective,
        FeatureFlagDirective,
        NxClickDoubleDirective,
        ResizeModule,
        RotateModule,
        NxTranslateOverrideDirective
    ]
})
export class DirectivesModule {
}
