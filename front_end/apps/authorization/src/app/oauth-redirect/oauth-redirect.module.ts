import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';

import { PipesModule } from '@app/pipes/pipes.module';
import { PreLoaderModule } from '@components/placeholders/pre-loader/pre-loader.module';
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
        PreLoaderModule,
        RouterModule.forChild(appRoutes),
    ],
    providers: [],
    declarations: [NxOAuthRedirectComponent],
    bootstrap: [],
    exports: [],
})
export class NxOAuthRedirectModule {}
