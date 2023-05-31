import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AngularSvgIconModule } from 'angular-svg-icon';

import { PasswordTagValidationModule } from '@components/password-input-tag-validation/password-tag-validation.module';
import { DirectivesModule } from '@directives/directives.module';

import { NxPasswordComponent } from './password.component';

@NgModule({
    imports: [
        CommonModule,
        FormsModule,
        DirectivesModule,
        AngularSvgIconModule,
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
