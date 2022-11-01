import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { AngularSvgIconModule } from 'angular-svg-icon';

import { PipesModule } from '@app/pipes/pipes.module';
import { PreLoaderModule } from '@components/placeholders/pre-loader/pre-loader.module';
import { ProcessButtonModule } from '@components/process-button/process-button.module';

import { LoginWebadminModalContent } from './login-webadmin.component';

@NgModule({
    imports: [
        PreLoaderModule,
        AngularSvgIconModule.forRoot(),
        ProcessButtonModule,
        PipesModule,
        TranslateModule,
        CommonModule,
        FormsModule,
        ReactiveFormsModule
    ],
    declarations: [
        LoginWebadminModalContent
    ],
    exports: [
        LoginWebadminModalContent
    ]
})
export class LoginWebadminModule { }
