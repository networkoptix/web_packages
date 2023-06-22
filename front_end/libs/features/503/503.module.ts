import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';

import { PipesModule } from '@app/pipes/pipes.module';
import { DirectivesModule } from '@directives/directives.module';

import { Nx503Component } from './503.component';

const appRoutes: Routes = [
    {
        path: '',
        title: 'Maintenance is in progress',
        component: Nx503Component,
    },
];

@NgModule({
    imports: [
        CommonModule,

        RouterModule.forChild(appRoutes),
        TranslateModule,
        DirectivesModule,
        PipesModule,
    ],
    providers: [],
    declarations: [Nx503Component],
    bootstrap: [],
    exports: [Nx503Component],
})
export class Nx503Module {}
