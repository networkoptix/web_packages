import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';

import { NxPasswordComponent } from '@components/password-input/password.component';
import { NxPasswordValidationComponent } from '@components/password-input-validation/password-validation.component';
import { NxProcessButtonComponent } from '@components/process-button/process-button.component';
import { NxProcessCancelButtonComponent } from '@components/process-cancel-Button/process-cancel-button.component';

import { ChangePasswordModalContent } from './change-password.component';

@NgModule({
    imports: [
        CommonModule,
        FormsModule,
        // AngularSvgIconModule,
        TranslateModule,

        NxPasswordComponent,
        NxPasswordValidationComponent,
        NxProcessButtonComponent,
        NxProcessCancelButtonComponent,
    ],
    declarations: [ChangePasswordModalContent],
    providers: [],
    exports: [ChangePasswordModalContent],
})
export class ChangePasswordModalModule {}
