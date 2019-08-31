import { Injectable, NgModule }                  from '@angular/core';
import { CommonModule }                          from '@angular/common';
import { BrowserModule }                         from '@angular/platform-browser';
import { UpgradeModule }                         from '@angular/upgrade/static';
import { Resolve, Router, RouterModule, Routes } from '@angular/router';
import { FormsModule }                           from '@angular/forms';

import { NxAccountComponent } from './account.component';

import { TranslateModule }       from '@ngx-translate/core';
import { ComponentsModule }      from '../../components/components.module';
import { NxAccountSettingsComponent } from './settings/settings.component';
import { NxAccountPasswordComponent } from './password/password.component';
import { NxAccountSettingsModule } from './settings/settings.module';
import { NxAccountPasswordModule } from './password/password.module';
import { ApplyGuard } from '../../routeGuards/applyGuard';

@Injectable()
export class TypeResolver implements Resolve<any> {

    constructor() {}

    resolve() {
        return 'password';
    }
}

const appRoutes: Routes = [
    {
        path: 'account', component: NxAccountComponent,
        children: [
            { path: '', component: NxAccountSettingsComponent, canDeactivate: [ApplyGuard] },
            { path: 'password', component: NxAccountPasswordComponent, canDeactivate: [ApplyGuard] }
        ]
    },
];

@NgModule({
    imports        : [
        CommonModule,
        BrowserModule,
        UpgradeModule,
        TranslateModule,
        ComponentsModule,
        FormsModule,
        NxAccountSettingsModule,
        NxAccountPasswordModule,

        RouterModule.forChild(appRoutes)
    ],
    providers      : [
        TypeResolver
    ],
    declarations   : [
        NxAccountComponent,
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
