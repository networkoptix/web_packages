import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';

import { PasswordModule } from '@components/password-input/password.module';
import { PasswordValidationModule } from '@components/password-input-validation/password-validation.module';
import { ProcessButtonModule } from '@components/process-button/process-button.module';
import { ProcessCancelButtonModule } from '@components/process-cancel-Button/process-cancel-Button.module';

import { ChangePasswordModalContent } from './change-password.component';

@NgModule({
    imports: [
        CommonModule,
        FormsModule,
        // AngularSvgIconModule,
        TranslateModule,

        PasswordModule,
        PasswordValidationModule,
        ProcessButtonModule,
        ProcessCancelButtonModule,
    ],
    declarations: [ChangePasswordModalContent],
    providers: [],
    exports: [ChangePasswordModalContent],
})
export class ChangePasswordModalModule {}
