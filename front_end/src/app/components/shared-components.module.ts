import { PortalModule } from '@angular/cdk/portal';
import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { AngularSvgIconModule } from 'angular-svg-icon';

import { DirectivesModule } from '@directives/directives.module';
import { PipesModule } from '@app/pipes/pipes.module';

import { CheckboxModule } from './checkbox/checkbox.module';
import { EmailModule } from './email-input/email.module';
import { FooterModule } from './footer/footer.module';
import { PasswordTagValidationModule } from './password-input-tag-validation/password-tag-validation.module';
import { PasswordValidationModule } from './password-input-validation/password-validation.module';
import { PasswordModule } from './password-input/password.module';
import { PreLoaderModule } from './placeholders/pre-loader/pre-loader.module';
import { ProcessButtonModule } from './process-button/process-button.module';
import { RadioModule } from './radio/radio.module';
import { ThemeSwitcherModule } from './theme-switcher/theme-switcher.module';
import { ToastContainerModule } from './toast/toast-container.module';
import { TooltipModule } from './tooltip/tooltip.module';

@NgModule({
    imports: [
        PortalModule,
        CommonModule,
        RouterModule,
        TranslateModule,
        FormsModule,
        AngularSvgIconModule.forRoot(),
        DirectivesModule,
        FooterModule,
        PipesModule,
        PreLoaderModule,
        ProcessButtonModule,
        PasswordValidationModule,
        PasswordModule,
        PasswordTagValidationModule,
        RadioModule,
        CheckboxModule,
        EmailModule,
        ToastContainerModule,
        ThemeSwitcherModule,
        TooltipModule,
    ],
    declarations: [
    ],
    providers: [
    ],
    exports: [
        FooterModule,
        PreLoaderModule,
        ProcessButtonModule,
        PasswordValidationModule,
        PasswordModule,
        PasswordTagValidationModule,
        RadioModule,
        CheckboxModule,
        EmailModule,
        ToastContainerModule,
        ThemeSwitcherModule,
        TooltipModule,
    ]
})
export class SharedComponentsModule {
}
