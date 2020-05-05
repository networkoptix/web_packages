import { Injectable, NgModule }          from '@angular/core';
import { CommonModule }                  from '@angular/common';
import { BrowserModule }                 from '@angular/platform-browser';
import { UpgradeModule }                 from '@angular/upgrade/static';
import { Resolve, RouterModule, Routes } from '@angular/router';
import { FormsModule }                   from '@angular/forms';
import { TranslateModule }               from '@ngx-translate/core';


import { ComponentsModule }      from '../../components/components.module';
import { ApplyGuard, AuthGuard } from '../../routeGuards';
import {
    NxAccountComponent,
    NxAccountSettingsModule, NxAccountSettingsComponent,
    NxAccountPasswordModule, NxAccountPasswordComponent
} from './';

@Injectable()
export class TypeResolver implements Resolve<any> {
    constructor() {}

    resolve() {
        return 'password';
    }
}

const appRoutes: Routes = [
    {
        path: 'account', component: NxAccountComponent, canActivate: [AuthGuard],
        children: [
            { path: '', component: NxAccountSettingsComponent, canDeactivate: [ApplyGuard] },
            { path: 'password', component: NxAccountPasswordComponent, canDeactivate: [ApplyGuard] }
        ]
    }
];

@NgModule({
    imports: [
        CommonModule,
        BrowserModule,
        UpgradeModule,
        TranslateModule,
        ComponentsModule,
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
    entryComponents: [
        NxAccountComponent
    ],
    exports        : [
        NxAccountComponent
    ]
})
export class NxAccountModule {
}
