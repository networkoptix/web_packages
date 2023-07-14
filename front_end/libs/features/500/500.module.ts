import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';

import { NxPagePlaceholderComponent } from '@components/placeholders/page/page-placeholder.component';
import { DirectivesModule } from '@directives/directives.module';
import { PipesModule } from '@pipes/pipes.module';

import { Nx500Component } from './500.component';

const appRoutes: Routes = [
    {
        path: '',
        title: 'systemServerError',
        component: Nx500Component,
    },
];

@NgModule({
    imports: [
        CommonModule,
        RouterModule.forChild(appRoutes),
        TranslateModule,
        DirectivesModule,
        NxPagePlaceholderComponent,
        PipesModule,
    ],
    providers: [],
    declarations: [Nx500Component],
    bootstrap: [],
    exports: [Nx500Component],
})
export class Nx500Module {}
