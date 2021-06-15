import { Injectable, NgModule }          from '@angular/core';
import { CommonModule }                  from '@angular/common';
import { Resolve, RouterModule, Routes } from '@angular/router';
import { FormsModule }                   from '@angular/forms';
import { TranslateModule }               from '@ngx-translate/core';

import { ComponentsModule }              from '../../components/components.module';
import { DirectivesModule }              from '../../directives/directives.module';
import { ApplyGuard, AuthGuard }         from '../../routeGuards';
import {
    NxAccountComponent,
    NxAccountSettingsModule, NxAccountSettingsComponent,
    NxAccountPasswordModule, NxAccountPasswordComponent
}                                        from './';
import { MenuModule }                    from '../../menu';
import { PipesModule } from '@src/pipes/pipes.module';

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
            { path: 'password', component: NxAccountPasswordComponent, canDeactivate: [ApplyGuard] }
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
