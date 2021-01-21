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

export const authorizedRoutes: Routes = [
    {
        path        : 'authorize',
        component   : NxAuthorizeComponent,
        canActivate : [],
        children    : [
            {
                path          : '',
                component     : NxAuthorizeEmailComponent,
                canDeactivate : []
            },
            {
                path          : 'password',
                component     : NxAuthorizePasswordComponent,
                canDeactivate : [],
                canActivate   : []
            },
            {
                path          : 'create-account',
                component     : NxAuthorizeCreateAccountComponent,
                canDeactivate : [],
                canActivate   : []
            },
            {
                path          : 'activate-account',
                component     : NxAuthorizeActivateAccountComponent,
                canDeactivate : [],
                canActivate   : []
            },
            {
                path          : 'confirmation',
                component     : NxAuthorizeConfirmationComponent,
                canDeactivate : [],
                canActivate   : []
            }
        ]
    }
];

@NgModule({
    imports: [
        CommonModule,
        NgbModule,
        TranslateModule,
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
    exports: [
        NxAuthorizeComponent
    ]
})
export class NxAuthorizeModule {
}
