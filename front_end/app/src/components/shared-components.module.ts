import { PortalModule } from '@angular/cdk/portal';
import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { AngularSvgIconModule } from 'angular-svg-icon';

import { NxTooltipComponent } from '@components/tooltip/tooltip.component';
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
        PortalModule,
        CommonModule,
        TranslateModule,
        FormsModule,
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
        NxTagComponent,
        NxTooltipComponent,
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
        NxTagComponent,
        NxTooltipComponent,
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
        NxTagComponent,
        NxTooltipComponent,
    ]
})
export class SharedComponentsModule {
}
