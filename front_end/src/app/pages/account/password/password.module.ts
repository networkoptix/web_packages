import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { AngularSvgIconModule } from 'angular-svg-icon';

import { PipesModule } from '@app/pipes/pipes.module';
import { ComponentsModule } from '@components/components.module';
import { ContentBlockModule } from '@components/content-block/content-block.module';
import { PasswordTagValidationModule } from '@components/password-input-tag-validation/password-tag-validation.module';
import { DirectivesModule } from '@directives/directives.module';
import { NxAccountPasswordComponent } from '@pages/account/password/password.component';

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
        ContentBlockModule
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
