import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';

import { PipesModule } from '@app/pipes/pipes.module';
import { PagePlaceHolderModule } from '@components/placeholders/page/page-placeholder.module';
import { PreLoaderModule } from '@components/placeholders/pre-loader/pre-loader.module';
import { DirectivesModule } from '@directives/directives.module';

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
        DirectivesModule,
        PagePlaceHolderModule,
        PipesModule,
        PreLoaderModule,
    ],
    providers: [],
    declarations: [Nx404Component],
    bootstrap: [],
    exports: [Nx404Component],
})
export class Nx404Module {}
