import { NgModule }             from '@angular/core';
import { CommonModule }         from '@angular/common';
import { BrowserModule }        from '@angular/platform-browser';
import { UpgradeModule }        from '@angular/upgrade/static';
import { RouterModule, Routes } from '@angular/router';
import { TranslateModule }      from '@ngx-translate/core';

import { Nx500Component }       from './500.component';
import { ComponentsModule }     from '../../components/components.module';
import { DirectivesModule }     from '../../directives/directives.module';

const appRoutes: Routes = [
    { path: '500', component: Nx500Component },
];

@NgModule({
    imports        : [
        CommonModule,
        BrowserModule,
        UpgradeModule,
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
    entryComponents: [
        Nx500Component,
    ],
    exports        : [
        Nx500Component,
    ]
})
export class Nx500Module {
}
