import { NgModule }             from '@angular/core';
import { CommonModule }         from '@angular/common';
import { RouterModule, Routes } from '@angular/router';
import { TranslateModule }      from '@ngx-translate/core';

import { NxOAuthRedirectComponent }   from './oauth-redirect.component';
import { DirectivesModule }     from '@directives/directives.module';
import { PipesModule }          from '@src/pipes/pipes.module';
import { SharedComponentsModule } from '@components/shared-components.module';

const appRoutes: Routes = [
    { path: '', component: NxOAuthRedirectComponent }
];

@NgModule({
    imports: [
        CommonModule,
        TranslateModule,
        SharedComponentsModule,
        DirectivesModule,
        PipesModule,
        RouterModule.forChild(appRoutes)
    ],
    providers: [],
    declarations: [
        NxOAuthRedirectComponent
    ],
    bootstrap: [],
    exports: [
        NxOAuthRedirectComponent
    ]
})
export class NxOAuthRedirectModule {
}
