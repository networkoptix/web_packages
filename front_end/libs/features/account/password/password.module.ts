import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { AngularSvgIconModule } from 'angular-svg-icon';

import { PipesModule } from '@app/pipes/pipes.module';
import { ContentBlockModule } from '@components/content-block/content-block.module';
import { ContentBlockSectionModule } from '@components/content-block/section/section.module';
import { PasswordModule } from '@components/password-input/password.module';
import { PasswordTagValidationModule } from '@components/password-input-tag-validation/password-tag-validation.module';
import { PasswordValidationModule } from '@components/password-input-validation/password-validation.module';
import { PreLoaderModule } from '@components/placeholders/pre-loader/pre-loader.module';
import { DirectivesModule } from '@directives/directives.module';
import { NxAccountPasswordComponent } from '@pages/account/password/password.component';

@NgModule({
    imports: [
        CommonModule,
        FormsModule,
        RouterModule,
        TranslateModule,
        AngularSvgIconModule,
        ContentBlockModule,
        ContentBlockSectionModule,
        DirectivesModule,
        PasswordModule,
        PasswordTagValidationModule,
        PasswordValidationModule,
        PipesModule,
        PreLoaderModule,
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
