import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule } from '@ngx-translate/core';
import { AngularSvgIconModule } from 'angular-svg-icon';

import { DirectivesModule } from '@directives/directives.module';
import { PipesModule } from '@src/pipes/pipes.module';

import { NxCheckboxComponent } from './checkbox/checkbox.component';
import { NxEmailComponent } from './email-input/email.component';
import {
    NxPasswordTagValidationComponent
} from './password-input-tag-validation/password-tag-validation.component';
import {
    NxPasswordValidationComponent
} from './password-input-validation/password-validation.component';
import { NxPasswordComponent } from './password-input/password.component';
import {
    NxPreLoaderComponent
} from './placeholders/pre-loader/pre-loader.component';
import {
    NxProcessButtonComponent
} from './process-button/process-button.component';
import {
    NxProcessCancelButtonComponent
} from './process-cancel-Button/process-cancel-button.component';
import { NxTagComponent } from './tag/tag.component';

@NgModule({
    imports: [
        CommonModule,
        TranslateModule,
        FormsModule,
        NgbModule,
        DirectivesModule,
        PipesModule,
        AngularSvgIconModule.forRoot()
    ],
    declarations: [
        NxCheckboxComponent,
        NxEmailComponent,
        NxPasswordComponent,
        NxPasswordTagValidationComponent,
        NxPasswordValidationComponent,
        NxPreLoaderComponent,
        NxProcessButtonComponent,
        NxProcessCancelButtonComponent,
        NxTagComponent
    ],
    providers: [
        NxCheckboxComponent,
        NxEmailComponent,
        NxPasswordComponent,
        NxPasswordTagValidationComponent,
        NxPasswordValidationComponent,
        NxPreLoaderComponent,
        NxProcessButtonComponent,
        NxProcessCancelButtonComponent,
        NxTagComponent
    ],
    exports: [
        NxCheckboxComponent,
        NxEmailComponent,
        NxPasswordComponent,
        NxPasswordTagValidationComponent,
        NxPasswordValidationComponent,
        NxPreLoaderComponent,
        NxProcessButtonComponent,
        NxProcessCancelButtonComponent,
        NxTagComponent
    ]
})
export class SharedComponentsModule {
}
