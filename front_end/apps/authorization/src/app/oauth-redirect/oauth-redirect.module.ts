import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';

import { PipesModule } from '@app/pipes/pipes.module';
import { NxPreLoaderComponent } from '@components/placeholders/pre-loader/pre-loader.component';
import { DirectivesModule } from '@directives/directives.module';

import { NxOAuthRedirectComponent } from './oauth-redirect.component';

const appRoutes: Routes = [
    {
        path: '',
        title: 'default',
        component: NxOAuthRedirectComponent,
    },
];

@NgModule({
    imports: [
        CommonModule,
        TranslateModule,
        DirectivesModule,
        PipesModule,
        NxPreLoaderComponent,
        RouterModule.forChild(appRoutes),
    ],
    providers: [],
    declarations: [NxOAuthRedirectComponent],
    bootstrap: [],
    exports: [],
})
export class NxOAuthRedirectModule {}
