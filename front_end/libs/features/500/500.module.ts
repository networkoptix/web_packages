import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { NxPagePlaceholder500Component } from '@components/placeholders/500/500-page-placeholder.component';

import { Nx500Component } from './500.component';

const appRoutes: Routes = [
    {
        path: '',
        title: 'systemServerError',
        component: Nx500Component,
    },
];

@NgModule({
    imports: [RouterModule.forChild(appRoutes), NxPagePlaceholder500Component],
    providers: [],
    declarations: [Nx500Component],
    bootstrap: [],
    exports: [Nx500Component],
})
export class Nx500Module {}
