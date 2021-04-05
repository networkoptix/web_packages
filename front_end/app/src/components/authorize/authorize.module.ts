import { NgModule }             from '@angular/core';
import { CommonModule }         from '@angular/common';
import { RouterModule, Routes } from '@angular/router';
import { AngularSvgIconModule } from 'angular-svg-icon';
import { NgbModule }            from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule }      from '@ngx-translate/core';
import { ComponentsModule }     from '@components/components.module';
import {
    ReactiveFormsModule, FormsModule
}                               from '@angular/forms';
// import {
//     ApplyGuard, AuthGuard, SystemGuard
// }                                    from '../../../routeGuards';

import { NxAuthorizeComponent } from './authorize.component';
import { NxAuthorizeEmailComponent } from './email/email.component';
import { NxAuthorizePasswordComponent } from './password/password.component';
import { NxAuthorizeCreateAccountComponent } from './create-account/create-account.component';
import { NxAuthorizeActivateAccountComponent } from './activate-account/activate-account.component';
import { NxAuthorizeConfirmationComponent } from './confirmation/confirmation.component';
import { NxAuthorizeResetPasswordComponent } from './reset-password/reset-password.component';
import { NxAuthorizeResetRequestComponent } from './reset-request/reset-request.component';
import { NxAuthorizeConnectErrorComponent } from './connect-error/connect-error.component';

export const authorizedRoutes: Routes = [
    { path: 'authorize', component: NxAuthorizeComponent },
    { path: 'authorize/activate/:code', component: NxAuthorizeComponent, data: { action: 'activate' } },
    { path: 'authorize/restore_password/:code', component: NxAuthorizeComponent, data: { action: 'restore_password' } }
];

@NgModule({
    imports: [
        CommonModule,
        NgbModule,
        TranslateModule,
        ReactiveFormsModule,
        FormsModule,
        ComponentsModule,
        RouterModule.forRoot(authorizedRoutes),
        AngularSvgIconModule.forRoot()
    ],
    declarations: [
        NxAuthorizeComponent,
        NxAuthorizeEmailComponent,
        NxAuthorizePasswordComponent,
        NxAuthorizeCreateAccountComponent,
        NxAuthorizeActivateAccountComponent,
        NxAuthorizeConfirmationComponent,
        NxAuthorizeResetPasswordComponent,
        NxAuthorizeResetRequestComponent,
        NxAuthorizeConnectErrorComponent
    ],
    exports: [
        NxAuthorizeComponent
    ]
})
export class NxAuthorizeModule {
}
