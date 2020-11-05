import { Injectable, NgModule }          from '@angular/core';
import { CommonModule }                  from '@angular/common';
import { BrowserModule }                 from '@angular/platform-browser';
import { UpgradeModule }                 from '@angular/upgrade/static';
import { Resolve, RouterModule, Routes } from '@angular/router';
import { FormsModule }                   from '@angular/forms';
import { TranslateModule }               from '@ngx-translate/core';

import { ComponentsModule }   from '../../components/components.module';
import { DirectivesModule }   from '../../directives/directives.module';
import { NxRestoreComponent } from './restore.component';

@Injectable()
export class ParamResolver implements Resolve<any> {
    constructor() {
    }

    resolve() {
        return 'restoring';
    }
}

@Injectable()
export class SentResolver implements Resolve<any> {
    constructor() {
    }

    resolve() {
        return 'restoringSuccess';
    }
}

@Injectable()
export class SuccessResolver implements Resolve<any> {
    constructor() {
    }

    resolve() {
        return 'changeSuccess';
    }
}

const appRoutes: Routes = [
    { path: 'restore_password', component: NxRestoreComponent, resolve: { uriParam: ParamResolver} },
    { path: 'restore_password/sent', component: NxRestoreComponent, resolve: { uriParam: SentResolver } },
    { path: 'restore_password/success', component: NxRestoreComponent, resolve: { uriParam: SuccessResolver } },
    { path: 'restore_password/:code', component: NxRestoreComponent }
];

// TODO: Remove it after test

@NgModule({
    imports: [
        CommonModule,
        BrowserModule,
        UpgradeModule,
        ComponentsModule,
        FormsModule,
        TranslateModule,
        RouterModule.forChild(appRoutes),
        DirectivesModule
    ],
    providers: [
        ParamResolver,
        SentResolver,
        SuccessResolver
    ],
    declarations: [
        NxRestoreComponent
    ],
    bootstrap: [
    ],
    exports: [
        NxRestoreComponent
    ]
})
export class NxRestoreModule {
}
