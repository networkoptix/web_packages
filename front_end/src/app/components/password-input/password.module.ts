import { NgModule } from '@angular/core';
import { AngularSvgIconModule } from 'angular-svg-icon';

import { ComponentsCoreModule } from '@components/components-core.module';
import { PasswordTagValidationModule } from '@components/password-input-tag-validation/password-tag-validation.module';

import { NxPasswordComponent } from './password.component';

@NgModule({
    imports: [
        AngularSvgIconModule.forRoot(),
        ComponentsCoreModule,
        PasswordTagValidationModule,
    ],
    declarations: [
        NxPasswordComponent
    ],
    providers: [
        NxPasswordComponent
    ],
    exports: [
        NxPasswordComponent
    ]
})

export class PasswordModule {}
