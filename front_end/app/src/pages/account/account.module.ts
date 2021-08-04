import { Injectable, NgModule }          from '@angular/core';
import { CommonModule }                  from '@angular/common';
import { Resolve, RouterModule, Routes } from '@angular/router';
import { FormsModule }                   from '@angular/forms';
import { TranslateModule }               from '@ngx-translate/core';
import { ComponentsModule }              from '@components/components.module';
import { DirectivesModule }              from '@directives/directives.module';
import { NxAccountSecurityComponent }    from '@pages/account/security/security.component';
import { MenuModule }                    from '@src/menu';
import { ApplyGuard, AuthGuard }         from '../../routeGuards';
import { NxAccountComponent }            from '@pages/account/account.component';
import { NxAccountSettingsComponent }    from '@pages/account/settings/settings.component';
import { NxAccountPasswordComponent }    from '@pages/account/password/password.component';
import { NxAccountSettingsModule }       from '@pages/account/settings/settings.module';
import { NxAccountPasswordModule }       from '@pages/account/password/password.module';
import { NxAccountSecurityModule }       from '@pages/account/security/security.module';
import { PipesModule }                   from '@src/pipes/pipes.module';

@Injectable()
export class TypeResolver implements Resolve<any> {
    constructor() {}

    resolve() {
        return 'password';
    }
}

const appRoutes: Routes = [
    {
        path        : 'account',
        component   : NxAccountComponent,
        canActivate : [AuthGuard],
        children    : [
            { path: '', component: NxAccountSettingsComponent, canDeactivate: [ApplyGuard] },
            { path: 'password', component: NxAccountPasswordComponent, canDeactivate: [ApplyGuard] },
            { path: 'security', component: NxAccountSecurityComponent, canDeactivate: [ApplyGuard] }
        ]
    }
];

@NgModule({
    imports: [
        CommonModule,
        TranslateModule,
        ComponentsModule,
        DirectivesModule,
        PipesModule,
        FormsModule,
        NxAccountSettingsModule,
        NxAccountPasswordModule,
        NxAccountSecurityModule,

        RouterModule.forChild(appRoutes),
        MenuModule
    ],
    providers      : [
        TypeResolver
    ],
    declarations   : [
        NxAccountComponent
    ],
    bootstrap      : [],
    exports        : [
        NxAccountComponent
    ]
})
export class NxAccountModule {
}
