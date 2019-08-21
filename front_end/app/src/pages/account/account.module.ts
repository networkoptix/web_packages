import { Injectable, NgModule }                  from '@angular/core';
import { CommonModule }                          from '@angular/common';
import { BrowserModule }                         from '@angular/platform-browser';
import { UpgradeModule }                         from '@angular/upgrade/static';
import { Resolve, Router, RouterModule, Routes } from '@angular/router';
import { FormsModule }                           from '@angular/forms';

import { NxAccountComponent } from './account.component';

import { TranslateModule }       from '@ngx-translate/core';
import { ComponentsModule }      from '../../components/components.module';

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
    },
    {
        path: 'account/password', component: NxAccountComponent, resolve: {passwordMode: TypeResolver}
    }
];

// TODO: Remove it after test

@NgModule({
    imports        : [
        CommonModule,
        BrowserModule,
        UpgradeModule,
        TranslateModule,
        ComponentsModule,
        FormsModule,

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
