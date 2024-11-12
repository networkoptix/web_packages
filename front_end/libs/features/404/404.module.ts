import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';

import { NxPagePlaceholder404Component } from '@components/placeholders/404/404-page-placeholder.component';
import { NxPreLoaderComponent } from '@components/placeholders/pre-loader/pre-loader.component';
import { PipesModule } from '@pipes/pipes.module';

import { Nx404Component } from './404.component';

const appRoutes: Routes = [
    {
        path: '',
        title: 'pageNotFound',
        component: Nx404Component,
    },
];

@NgModule({
    imports: [
        CommonModule,
        RouterModule.forChild(appRoutes),
        TranslateModule,
        PipesModule,
        NxPreLoaderComponent,
        NxPagePlaceholder404Component,
    ],
    providers: [],
    declarations: [Nx404Component],
    bootstrap: [],
    exports: [Nx404Component],
})
export class Nx404Module {}
