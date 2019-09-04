import { NgModule }             from '@angular/core';
import { CommonModule }         from '@angular/common';
import { BrowserModule }        from '@angular/platform-browser';
import { UpgradeModule }        from '@angular/upgrade/static';
import { RouterModule, Routes } from '@angular/router';
import { TranslateModule }  from '@ngx-translate/core';

import { Nx404Component } from './404.component';
import { ComponentsModule } from '../../components/components.module';

const appRoutes: Routes = [
    {
        path: '404', component: Nx404Component,
    }
];

// TODO: Remove it after test

@NgModule({
    imports        : [
        CommonModule,
        BrowserModule,
        UpgradeModule,
        TranslateModule,
        ComponentsModule,

        RouterModule.forChild(appRoutes)
    ],
    providers      : [],
    declarations   : [
        Nx404Component,
    ],
    bootstrap      : [],
    entryComponents: [
        Nx404Component,
    ],
    exports        : [
        Nx404Component,
    ]
})
export class Nx404Module {
}
