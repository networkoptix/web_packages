import { NgModule } from '@angular/core';

import { ApplyModule } from './apply/apply.module';
import { CarouselModule } from './carousel/carousel.module';
import { CheckboxModule } from './checkbox/checkbox.module';
import { AlertBlockModule } from './content-block/alert/block.module';
import { ContentBlockSectionModule } from './content-block/section/section.module';
import { ActiveSystemModule } from './dropdowns/active-system/active-system.module';
import { LanguageModule } from './dropdowns/language/language.module';
import { MultiSelectModule } from './dropdowns/multi-select/multi-select.module';
import { NavModule } from './dropdowns/nav-location/nav.module';
import { PermissionsModule } from './dropdowns/permissions/permissions.module';
import { EditableModule } from './editable/editable.module';
import { EmailModule } from './email-input/email.module';
import { ExternalVideoModule } from './external-video/external-video.module';
import { FooterModule } from './footer/footer.module';
import { HtmlInputModule } from './html-input/html-input.module';
import { LandingDisplayModule } from './landing-display/landing-display.module';
import { LoggerModule } from './logger/logger.module';
import { NumericModule } from './numeric-input/numeric.module';
import { ClientButtonModule } from './open-client-button/client-button.module';
import { PasswordTagValidationModule } from './password-input-tag-validation/password-tag-validation.module';
import { PasswordValidationModule } from './password-input-validation/password-validation.module';
import { PasswordModule } from './password-input/password.module';
import { PreLoaderModule } from './placeholders/pre-loader/pre-loader.module';
import { ProcessButtonModule } from './process-button/process-button.module';
import { ProcessCancelButtonModule } from './process-cancel-Button/process-cancel-Button.module';
import { RadioModule } from './radio/radio.module';
import { SwtichModule } from './switch/switch.module';
import { TagModule } from './tag/tag.module';
import { ToastModule } from './toast/toast.module';
import { TooltipModule } from './tooltip/tooltip.module';
import { UpdateWebadminSessionModule } from './update-webadmin-session/update-webadmin-session.module';

@NgModule({
    imports: [
        ActiveSystemModule,
        AlertBlockModule,
        ApplyModule,
        ContentBlockSectionModule,
        CarouselModule,
        CheckboxModule,
        ClientButtonModule,
        EditableModule,
        EmailModule,
        ExternalVideoModule,
        FooterModule,
        HtmlInputModule,
        LandingDisplayModule,
        LanguageModule,
        LoggerModule,
        MultiSelectModule,
        NavModule,
        NumericModule,
        PasswordModule,
        PasswordTagValidationModule,
        PasswordValidationModule,
        PermissionsModule,
        PreLoaderModule,
        ProcessButtonModule,
        ProcessCancelButtonModule,
        RadioModule,
        SwtichModule,
        TagModule,
        ToastModule,
        TooltipModule,
        UpdateWebadminSessionModule,
    ],
    exports: [
        ActiveSystemModule,
        AlertBlockModule,
        ApplyModule,
        ContentBlockSectionModule,
        CarouselModule,
        CheckboxModule,
        ClientButtonModule,
        EditableModule,
        EmailModule,
        ExternalVideoModule,
        FooterModule,

        HtmlInputModule,
        LandingDisplayModule,
        LanguageModule,
        LoggerModule,
        MultiSelectModule,
        NavModule,
        NumericModule,
        PasswordModule,
        PasswordTagValidationModule,
        PasswordValidationModule,
        PermissionsModule,
        PreLoaderModule,
        ProcessButtonModule,
        ProcessCancelButtonModule,
        RadioModule,
        SwtichModule,
        TagModule,
        ToastModule,
        TooltipModule,
        UpdateWebadminSessionModule,
    ]
})

export class ComponentsCommonModule { }
