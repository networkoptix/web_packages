import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { AngularSvgIconModule } from 'angular-svg-icon';

import { NxContentBlockComponent } from '@components/content-block/content-block.component';
import { NxContentBlockSectionComponent } from '@components/content-block/section/section.component';
import { NxPasswordComponent } from '@components/password-input/password.component';
import { NxPasswordTagValidationComponent } from '@components/password-input-tag-validation/password-tag-validation.component';
import { NxPasswordValidationComponent } from '@components/password-input-validation/password-validation.component';
import { NxPreLoaderComponent } from '@components/placeholders/pre-loader/pre-loader.component';
import { DirectivesModule } from '@directives/directives.module';
import { NxAccountPasswordComponent } from '@pages/account/password/password.component';
import { PipesModule } from '@pipes/pipes.module';

@NgModule({
    imports: [
        CommonModule,
        FormsModule,
        RouterModule,
        TranslateModule,
        AngularSvgIconModule,
        NxContentBlockComponent,
        NxContentBlockSectionComponent,
        DirectivesModule,
        NxPasswordComponent,
        NxPasswordTagValidationComponent,
        NxPasswordValidationComponent,
        PipesModule,
        NxPreLoaderComponent,
    ],
    providers: [],
    declarations: [NxAccountPasswordComponent],
    bootstrap: [],
    exports: [NxAccountPasswordComponent],
})
export class NxAccountPasswordModule {}
