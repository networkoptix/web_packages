import { Injectable, NgModule }          from '@angular/core';
import { CommonModule }                  from '@angular/common';
import { BrowserModule }                 from '@angular/platform-browser';
import { UpgradeModule }                 from '@angular/upgrade/static';
import { Resolve, RouterModule, Routes } from '@angular/router';
import { FormsModule }                   from '@angular/forms';
import { TranslateModule }               from '@ngx-translate/core';
import { InputTrimModule }               from 'ng2-trim-directive';

import { ComponentsModule }              from '../../components/components.module';
import { LandingModule }                 from '../landing/landing.module';
import { DirectivesModule }              from '../../directives/directives.module';
import { NxRegisterComponent }           from './register.component';

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
    { path: 'register/success', component: NxRegisterComponent, resolve: { uriParam: SuccessResolver } },
    { path: 'register/successActivated', component: NxRegisterComponent, resolve: { uriParam: ActivatedResolver } },
    { path: 'register/:code', component: NxRegisterComponent }
];

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
        TranslateModule,
        InputTrimModule
    ],
    providers: [
        SuccessResolver,
        ActivatedResolver
    ],
    declarations: [
        NxRegisterComponent
    ],
    bootstrap : [],
    entryComponents : [
        NxRegisterComponent
    ],
    exports: [
        NxRegisterComponent
    ]
})
export class NxRegisterModule {
}
