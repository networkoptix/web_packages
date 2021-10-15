import { Injectable, NgModule }          from '@angular/core';
import { CommonModule }                  from '@angular/common';
import { Resolve, RouterModule, Routes } from '@angular/router';
import { FormsModule }                   from '@angular/forms';
import { TranslateModule }               from '@ngx-translate/core';

import { ComponentsModule }              from '@components/components.module';
import { DirectivesModule }              from '@directives/directives.module';
import { NxActivateComponent }           from './activate.component';
import { ManualAccessGuard }             from '@guards/manualAccessGuard';
import { PipesModule }                   from '@src/pipes/pipes.module';

@Injectable()
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
    { path: 'activate', component: NxActivateComponent, canActivate: [ManualAccessGuard], resolve: { uriParam: ParamResolver } },
    { path: 'activate/success', component: NxActivateComponent, canActivate: [ManualAccessGuard], resolve: { uriParam: ActivatedResolver } },
    { path: 'activate/:code', redirectTo: 'authorize/activate/:code' }
];

@NgModule({
    imports: [
        CommonModule,
        ComponentsModule,
        FormsModule,
        DirectivesModule,
        PipesModule,
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
    bootstrap: [],
    exports: [
        NxActivateComponent
    ]
})
export class NxActivateModule {
}
