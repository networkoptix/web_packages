import { PortalModule } from '@angular/cdk/portal';
import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { AngularSvgIconModule } from 'angular-svg-icon';

import { NxContentBlockComponent } from '@components/content-block/content-block.component';
import { NxContentBlockSectionComponent } from '@components/content-block/section/section.component';
import { NxRadioComponent } from '@components/radio/radio.component';
import { NxThemeSwitcherComponent } from '@components/theme-switcher/theme-switcher.component';
import { NxToast } from '@components/toast/toast.component';
import { NxToastsContainer } from '@components/toast/toast.container';
import { NxTooltipComponent } from '@components/tooltip/tooltip.component';
import { DirectivesModule } from '@directives/directives.module';
import { PipesModule } from '@src/pipes/pipes.module';

import { NxCheckboxComponent } from './checkbox/checkbox.component';
import { NxEmailComponent } from './email-input/email.component';
import { NxFooterComponent } from './footer/footer.component';
import {
    NxPasswordTagValidationComponent
} from './password-input-tag-validation/password-tag-validation.component';
import {
    NxPasswordValidationComponent
} from './password-input-validation/password-validation.component';
import { NxPasswordComponent } from './password-input/password.component';
import {
    NxPreLoaderComponent
} from './placeholders/pre-loader/pre-loader.component';
import {
    NxProcessButtonComponent
} from './process-button/process-button.component';
import {
    NxProcessCancelButtonComponent
} from './process-cancel-Button/process-cancel-button.component';
import { NxTagComponent } from './tag/tag.component';

@NgModule({
    imports: [
        PortalModule,
        CommonModule,
        RouterModule,
        TranslateModule,
        FormsModule,
        DirectivesModule,
        PipesModule,
        AngularSvgIconModule.forRoot(),
    ],
    declarations: [
        NxCheckboxComponent,
        NxEmailComponent,
        NxFooterComponent,
        NxPasswordComponent,
        NxPasswordTagValidationComponent,
        NxPasswordValidationComponent,
        NxPreLoaderComponent,
        NxProcessButtonComponent,
        NxProcessCancelButtonComponent,
        NxTagComponent,
        NxToast,
        NxToastsContainer,
        NxTooltipComponent,
        NxToastsContainer,
        NxToast,
        NxThemeSwitcherComponent,
        NxContentBlockComponent,
        NxContentBlockSectionComponent,
        NxRadioComponent,
    ],
    providers: [
        NxCheckboxComponent,
        NxEmailComponent,
        NxFooterComponent,
        NxPasswordComponent,
        NxPasswordTagValidationComponent,
        NxPasswordValidationComponent,
        NxPreLoaderComponent,
        NxProcessButtonComponent,
        NxProcessCancelButtonComponent,
        NxTagComponent,
        NxToastsContainer,
        NxTooltipComponent,
        NxToastsContainer,
        NxToast,
        NxThemeSwitcherComponent,
        NxContentBlockComponent,
        NxContentBlockSectionComponent,
        NxRadioComponent,
    ],
    exports: [
        NxCheckboxComponent,
        NxEmailComponent,
        NxFooterComponent,
        NxPasswordComponent,
        NxPasswordTagValidationComponent,
        NxPasswordValidationComponent,
        NxPreLoaderComponent,
        NxProcessButtonComponent,
        NxProcessCancelButtonComponent,
        NxTagComponent,
        NxToastsContainer,
        NxTooltipComponent,
        NxToastsContainer,
        NxToast,
        NxThemeSwitcherComponent,
        NxContentBlockComponent,
        NxContentBlockSectionComponent,
        NxRadioComponent,
    ]
})
export class SharedComponentsModule {
}
