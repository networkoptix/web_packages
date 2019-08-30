import { Injectable, NgModule }          from '@angular/core';
import { CommonModule }                  from '@angular/common';
import { BrowserModule }                 from '@angular/platform-browser';
import { UpgradeModule }                 from '@angular/upgrade/static';
import { Resolve, RouterModule, Routes } from '@angular/router';
import { FormsModule }                   from '@angular/forms';
import { ComponentsModule }              from '../../components/components.module';

import { LandingModule }       from '../landing/landing.module';
import { DirectivesModule }    from '../../directives/directives.module';
import { NxRegisterComponent } from './register.component';
import { TranslateModule }     from '@ngx-translate/core';

@Injectable()
export class SuccessResolver implements Resolve<any> {
    constructor() {}

    resolve() {
        return 'registerSuccess';
    }
}
@Injectable()
export class ActivatedResolver implements Resolve<any> {
    constructor() {}

    resolve() {
        return 'activated';
    }
}

const appRoutes: Routes = [
    { path: 'register', component: NxRegisterComponent },
    { path: 'register/success', component: NxRegisterComponent, resolve: { uriParam: SuccessResolver }},
    { path: 'register/successActivated', component: NxRegisterComponent, resolve: { uriParam: ActivatedResolver }},
    { path: 'register/:code', component: NxRegisterComponent}
];

// TODO: Remove it after test

@NgModule({
    imports: [
        CommonModule,
        BrowserModule,
        UpgradeModule,
        ComponentsModule,
        FormsModule,
        LandingModule,
        DirectivesModule,

        RouterModule.forChild(appRoutes),
        TranslateModule
    ],
    providers      : [
        SuccessResolver,
        ActivatedResolver,
    ],
    declarations   : [
        NxRegisterComponent,
    ],
    bootstrap      : [],
    entryComponents: [
        NxRegisterComponent
    ],
    exports        : [
        NxRegisterComponent
    ]
})
export class NxRegisterModule {
}