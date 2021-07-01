import { NgModule }             from '@angular/core';
import { CommonModule }         from '@angular/common';
import { RouterModule, Routes } from '@angular/router';
import { TranslateModule }      from '@ngx-translate/core';

import { NxOAuthRedirectComponent }   from './oauth-redirect.component';
import { ComponentsModule }     from '../../components/components.module';
import { DirectivesModule }     from '../../directives/directives.module';
import { PipesModule }          from '@src/pipes/pipes.module';

const appRoutes: Routes = [
    { path: '', component: NxOAuthRedirectComponent, pathMatch: 'full' }
];

@NgModule({
    imports : [
        CommonModule,
        TranslateModule,
        ComponentsModule,
        DirectivesModule,
        PipesModule,
        RouterModule.forChild(appRoutes)
    ],
    providers : [],
    declarations : [
        NxOAuthRedirectComponent
    ],
    bootstrap : [],
    exports: [
        NxOAuthRedirectComponent
    ]
})
export class NxOAuthRedirectModule {
}
