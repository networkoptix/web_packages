import { Injectable, NgModule }          from '@angular/core';
import { CommonModule }                  from '@angular/common';
import { BrowserModule }                 from '@angular/platform-browser';
import { UpgradeModule }                 from '@angular/upgrade/static';
import { Resolve, RouterModule, Routes } from '@angular/router';
import { FormsModule }                   from '@angular/forms';
import { ComponentsModule }              from '../../components/components.module';

import { NxActivateComponent } from './activate.component';
import { TranslateModule }     from '@ngx-translate/core';

export class ParamResolver implements Resolve<any> {
    constructor() {
    }

    resolve() {
        return 'reactivating';
    }
}

@Injectable()
export class ActivatedResolver implements Resolve<any> {
    constructor() {
    }

    resolve() {
        return 'activationSuccess';
    }
}

const appRoutes: Routes = [
    { path: 'activate', component: NxActivateComponent, resolve: { uriParam: ParamResolver} },
    { path: 'activate/success', component: NxActivateComponent, resolve: { uriParam: ActivatedResolver } },
    { path: 'activate/:code', component: NxActivateComponent }
];

// TODO: Remove it after test

@NgModule({
    imports: [
        CommonModule,
        BrowserModule,
        UpgradeModule,
        ComponentsModule,
        FormsModule,

        RouterModule.forChild(appRoutes),
        TranslateModule
    ],
    providers      : [
        ParamResolver,
        ActivatedResolver,
    ],
    declarations   : [
        NxActivateComponent,
    ],
    bootstrap      : [],
    entryComponents: [
        NxActivateComponent
    ],
    exports        : [
        NxActivateComponent
    ]
})
export class NxActivateModule {
}
