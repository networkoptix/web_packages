import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { AngularSvgIconModule } from 'angular-svg-icon';

import { ComponentsModule } from '@components/components.module';
import { PasswordTagValidationModule } from '@components/password-input-tag-validation/password-tag-validation.module';
import { DirectivesModule } from '@directives/directives.module';
import { NxAccountPasswordComponent } from '@pages/account/password/password.component';
import { PipesModule } from '@src/pipes/pipes.module';

@NgModule({
    imports: [
        AngularSvgIconModule.forRoot(),
        CommonModule,
        RouterModule,
        FormsModule,
        TranslateModule,
        ComponentsModule,
        DirectivesModule,
        PasswordTagValidationModule,
        PipesModule,
    ],
    providers: [],
    declarations: [
        NxAccountPasswordComponent
    ],
    bootstrap: [],
    exports: [
        NxAccountPasswordComponent
    ]
})
export class NxAccountPasswordModule {
}
