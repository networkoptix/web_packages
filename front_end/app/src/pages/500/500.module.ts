import { NgModule }             from '@angular/core';
import { CommonModule }         from '@angular/common';
import { RouterModule, Routes } from '@angular/router';
import { TranslateModule }      from '@ngx-translate/core';

import { ComponentsModule }     from '../../components/components.module';
import { DirectivesModule }     from '../../directives/directives.module';
import { Nx500Component }       from './500.component';

const appRoutes: Routes = [
    { path: '500', component: Nx500Component },
];

@NgModule({
    imports        : [
        CommonModule,
        TranslateModule,
        ComponentsModule,
        DirectivesModule,
        RouterModule.forChild(appRoutes)
    ],
    providers      : [],
    declarations   : [
        Nx500Component,
    ],
    bootstrap      : [],
    exports        : [
        Nx500Component,
    ]
})
export class Nx500Module {
}
