import { CommonModule } from '@angular/common';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { NgModule } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterModule, Routes } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { AngularSvgIconModule } from 'angular-svg-icon';

import { BindSystemToCloudComponent } from '@authorization/src/app/components/bind-system-to-cloud/bind-system-to-cloud.component';
import { NxFooterComponent } from '@components/footer/footer.component';
import { NxNavFooterComponent } from '@components/nav-footer/nav-footer.component';
import { NxProcessButtonComponent } from '@components/process-button/process-button.component';
import { ToastContainerModule } from '@components/toast-container/toast-container.module';
import { NxAddSvgSrcDirective } from '@directives/add-data.directive';
import { NxFocusMeDirective } from '@directives/nx-focus-me';
import { PipesModule } from '@pipes/pipes.module';

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
        AngularSvgIconModule.forRoot(),
        NxAddSvgSrcDirective,
        PipesModule,
        NxFooterComponent,
        NxNavFooterComponent,
        NxProcessButtonComponent,
        ToastContainerModule,
        NxAuthorizeCreateAccountComponent,
        NxAuthorizeResetPasswordComponent,
        NxFocusMeDirective,
        BindSystemToCloudComponent,
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
    imports: [
        CommonModule,
        TranslateModule,
        ReactiveFormsModule,
        FormsModule,
        RouterModule.forChild(authorizedRoutes),
        AngularSvgIconModule,
        NxAddSvgSrcDirective,
        PipesModule,
        NxFooterComponent,
        NxNavFooterComponent,
        NxProcessButtonComponent,
        ToastContainerModule,
        NxAuthorizeCreateAccountComponent,
        NxAuthorizeResetPasswordComponent,
        NxFocusMeDirective,
        BindSystemToCloudComponent,
    ],
    providers: [provideHttpClient(withInterceptorsFromDi())],
})
export class NxAuthorizeModule {}
