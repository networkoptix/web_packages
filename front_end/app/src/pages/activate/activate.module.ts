import { Injectable, NgModule }          from '@angular/core';
import { CommonModule }                  from '@angular/common';
import { BrowserModule }                 from '@angular/platform-browser';
import { UpgradeModule }                 from '@angular/upgrade/static';
import { Resolve, RouterModule, Routes } from '@angular/router';
import { FormsModule }                   from '@angular/forms';
import { TranslateModule }               from '@ngx-translate/core';

import { ComponentsModule }              from '../../components/components.module';
import { DirectivesModule }              from '../../directives/directives.module';
import { NxActivateComponent }           from './activate.component';

export class ParamResolver implements Resolve<any> {
    constructor() {
    }

    resolve() {
        return 'reactivating';
    }
}

@Injectable()
export class ActivateResolver implements Resolve<any> {
    constructor() {
    }

    resolve() {
        return 'activating';
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
    { path: 'activate', component: NxActivateComponent, resolve: { uriParam: ParamResolver } },
    { path: 'activate/success', component: NxActivateComponent, resolve: { uriParam: ActivatedResolver } },
    { path: 'activate/:code', component: NxActivateComponent, resolve: { uriParam: ActivateResolver } }
];

@NgModule({
    imports: [
        CommonModule,
        BrowserModule,
        UpgradeModule,
        ComponentsModule,
        FormsModule,
        DirectivesModule,
        RouterModule.forChild(appRoutes),
        TranslateModule
    ],
    providers: [
        ParamResolver,
        ActivateResolver,
        ActivatedResolver
    ],
    declarations: [
        NxActivateComponent
    ],
    bootstrap       : [],
    entryComponents : [
        NxActivateComponent
    ],
    exports         : [
        NxActivateComponent
    ]
})
export class NxActivateModule {
}
