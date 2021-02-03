import { NgModule }                  from '@angular/core';
import { CommonModule }              from '@angular/common';
import { RouterModule, Routes }      from '@angular/router';
import { AngularSvgIconModule }           from 'angular-svg-icon';
import { NgbModule }                 from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule }           from '@ngx-translate/core';
import { ComponentsModule }          from '@components/components.module';
// import {
//     ApplyGuard, AuthGuard, SystemGuard
// }                                    from '../../../routeGuards';

import { NxAuthorizeComponent } from './authorize.component';
import { NxAuthorizeEmailComponent } from './email/email.component';
import { NxAuthorizePasswordComponent } from './password/password.component';
import { NxAuthorizeCreateAccountComponent } from './create-account/create-account.component';
import { NxAuthorizeActivateAccountComponent } from './activate-account/activate-account.component';
import { NxAuthorizeConfirmationComponent } from './confirmation/confirmation.component';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';

export const authorizedRoutes: Routes = [
    {
        path        : 'authorize',
        component   : NxAuthorizeComponent,
        canActivate : []
    }
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
        NxAuthorizeConfirmationComponent
    ],
    providers: [
        NxAuthorizeComponent,
        NxAuthorizeEmailComponent,
        NxAuthorizePasswordComponent,
        NxAuthorizeCreateAccountComponent,
        NxAuthorizeActivateAccountComponent,
        NxAuthorizeConfirmationComponent
    ],
    exports: [
        NxAuthorizeComponent
    ]
})
export class NxAuthorizeModule {
}
