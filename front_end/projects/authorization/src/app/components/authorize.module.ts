import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClientModule } from '@angular/common/http';
import { RouterModule, Routes } from '@angular/router';
import { AngularSvgIconModule } from 'angular-svg-icon';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule } from '@ngx-translate/core';
import {
    ReactiveFormsModule,
    FormsModule
} from '@angular/forms';

import { DirectivesModule } from '@directives/directives.module';
import { SharedComponentsModule } from '@components/shared-components.module';

import { NxAuthorizeComponent } from './authorize.component';
import { NxAuthorizeEmailComponent } from './email/email.component';
import { NxAuthorizePasswordComponent } from './password/password.component';
import { NxAuthorizeCreateAccountComponent } from './create-account/create-account.component';
import { NxAuthorizeActivateAccountComponent } from './activate-account/activate-account.component';
import { NxAuthorizeConfirmationComponent } from './confirmation/confirmation.component';
import { NxAuthorizeResetPasswordComponent } from './reset-password/reset-password.component';
import { NxAuthorizeResetRequestComponent } from './reset-request/reset-request.component';
import { NxAuthorizeConnectErrorComponent } from './connect-error/connect-error.component';
import { NxAuthorizeAuthCodeComponent } from './auth-code/auth-code.component';
import { NxAuthorizeBackupCodeComponent } from './backup-code/backup-code.component';
import { NxAuthorizeNotSecureComponent } from './not-secure/not-secure.component';
import { PipesModule } from '@src/pipes/pipes.module';

export const authorizedRoutes: Routes = [
    { path: 'activate/:code', component: NxAuthorizeComponent, data: { action: 'activate' } },
    { path: 'restore_password/:code', component: NxAuthorizeComponent, data: { action: 'restore_password' } },
    { path: 'restore_password', component: NxAuthorizeComponent, data: { action: 'reset_request' } }, // for systems < 5.0, desktop password reset request
    { path: 'register/:code', component: NxAuthorizeComponent, data: { action: 'register' } },
    { path: 'register', component: NxAuthorizeComponent, data: { action: 'register' } },
    { path: '**', component: NxAuthorizeComponent }
];

@NgModule({
    imports: [
        CommonModule,
        NgbModule,
        TranslateModule,
        ReactiveFormsModule,
        FormsModule,
        HttpClientModule,
        SharedComponentsModule,
        RouterModule.forChild(authorizedRoutes),
        AngularSvgIconModule.forRoot(),
        DirectivesModule,
        PipesModule
    ],
    providers: [
    ],
    declarations: [
        NxAuthorizeComponent,
        NxAuthorizeEmailComponent,
        NxAuthorizePasswordComponent,
        NxAuthorizeCreateAccountComponent,
        NxAuthorizeActivateAccountComponent,
        NxAuthorizeConfirmationComponent,
        NxAuthorizeNotSecureComponent,
        NxAuthorizeResetPasswordComponent,
        NxAuthorizeResetRequestComponent,
        NxAuthorizeConnectErrorComponent,
        NxAuthorizeAuthCodeComponent,
        NxAuthorizeBackupCodeComponent
    ],
    exports: [
        NxAuthorizeComponent
    ]
})
export class NxAuthorizeModule {
}
