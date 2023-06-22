import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';

import { NxPasswordValidationComponent } from './password-validation.component';

@NgModule({
    imports: [CommonModule, TranslateModule],
    declarations: [NxPasswordValidationComponent],
    providers: [NxPasswordValidationComponent],
    exports: [NxPasswordValidationComponent],
})
export class PasswordValidationModule {}
