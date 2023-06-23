import { CommonModule } from '@angular/common';
import { HttpClientModule } from '@angular/common/http';
import { NgModule } from '@angular/core';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { RouterModule, Routes } from '@angular/router';
import { StoreModule } from '@ngrx/store';
import { TranslateModule } from '@ngx-translate/core';
import { AngularSvgIconModule } from 'angular-svg-icon';

import { PipesModule } from '@app/pipes/pipes.module';
import { FooterModule } from '@components/footer/footer.module';
import { NavFooterModule } from '@components/nav-footer/nav-footer.module';
import { ProcessButtonModule } from '@components/process-button/process-button.module';
import { ToastContainerModule } from '@components/toast/toast-container.module';
import { DirectivesModule } from '@directives/directives.module';

import { NxAuthorizeActivateAccountComponent } from './activate-account/activate-account.component';
import { NxAuthorizeAuthCodeComponent } from './auth-code/auth-code.component';
import { NxAuthorizeComponent } from './authorize.component';
import { NxAuthorizeBackupCodeComponent } from './backup-code/backup-code.component';
import { NxAuthorizeConfirmationComponent } from './confirmation/confirmation.component';
import { NxAuthorizeConnectErrorComponent } from './connect-error/connect-error.component';
import { NxAuthorizeCreateAccountComponent } from './create-account/create-account.component';
import { NxAuthorizeEmailComponent } from './email/email.component';
import { NxAuthorizeNotSecureComponent } from './not-secure/not-secure.component';
import { NxAuthorizePasswordComponent } from './password/password.component';
import { NxAuthorizeResetPasswordComponent } from './reset-password/reset-password.component';
import { NxAuthorizeResetRequestComponent } from './reset-request/reset-request.component';
import { NxAuthorizeShow404Component } from './show-404/show-404.component';

export const authorizedRoutes: Routes = [
    {
        path: 'activate/:code',
        component: NxAuthorizeComponent,
        data: { action: 'activate' },
    },
    {
        path: 'activate',
        component: NxAuthorizeComponent,
        data: { action: '404' },
    },
    {
        path: 'restore_password/:code',
        component: NxAuthorizeComponent,
        data: { action: 'restore_password' },
    },
    {
        path: 'restore_password',
        component: NxAuthorizeComponent,
        data: { action: 'reset_request' },
    }, // for systems < 5.0, desktop password reset request
    {
        path: 'register/:code',
        component: NxAuthorizeComponent,
        data: { action: 'register' },
    },
    {
        path: 'register',
        component: NxAuthorizeComponent,
        data: { action: 'register' },
    },
    { path: '**', component: NxAuthorizeComponent },
];

@NgModule({
    imports: [
        CommonModule,
        TranslateModule,
        ReactiveFormsModule,
        FormsModule,
        HttpClientModule,
        RouterModule.forChild(authorizedRoutes),
        AngularSvgIconModule,
        StoreModule.forRoot({}),
        DirectivesModule,
        PipesModule,
        FooterModule,
        NavFooterModule,
        ProcessButtonModule,
        ToastContainerModule,
        NxAuthorizeCreateAccountComponent,
        NxAuthorizeResetPasswordComponent,
    ],
    providers: [],
    declarations: [
        NxAuthorizeComponent,
        NxAuthorizeEmailComponent,
        NxAuthorizePasswordComponent,
        NxAuthorizeActivateAccountComponent,
        NxAuthorizeConfirmationComponent,
        NxAuthorizeNotSecureComponent,
        NxAuthorizeResetRequestComponent,
        NxAuthorizeConnectErrorComponent,
        NxAuthorizeAuthCodeComponent,
        NxAuthorizeBackupCodeComponent,
        NxAuthorizeShow404Component,
    ],
    exports: [],
})
export class NxAuthorizeModule {}
