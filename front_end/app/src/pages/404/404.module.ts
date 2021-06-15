import { NgModule }             from '@angular/core';
import { CommonModule }         from '@angular/common';
import { RouterModule, Routes } from '@angular/router';
import { TranslateModule }      from '@ngx-translate/core';

import { ComponentsModule }     from '../../components/components.module';
import { DirectivesModule }     from '../../directives/directives.module';
import { Nx404Component }       from './404.component';
import { PipesModule }          from '@src/pipes/pipes.module';

const appRoutes: Routes = [
    { path: '', component: Nx404Component }
];

@NgModule({
    imports: [
        CommonModule,
        TranslateModule,
        ComponentsModule,
        DirectivesModule,
        PipesModule,
        RouterModule.forChild(appRoutes)
    ],
    providers: [],
    declarations: [
        Nx404Component
    ],
    bootstrap: [],
    exports: [
        Nx404Component
    ]
})
export class Nx404Module {
}
