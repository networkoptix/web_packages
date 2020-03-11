import { NgModule }             from '@angular/core';
import { CommonModule }         from '@angular/common';
import { BrowserModule }        from '@angular/platform-browser';
import { UpgradeModule }        from '@angular/upgrade/static';
import { RouterModule, Routes } from '@angular/router';
import { TranslateModule }  from '@ngx-translate/core';

import { Nx503Component } from './503.component';
import { ComponentsModule } from '../../components/components.module';

const appRoutes: Routes = [
    { path: '503', component: Nx503Component }
];

@NgModule({
    imports: [
        CommonModule,
        BrowserModule,
        UpgradeModule,
        TranslateModule,
        ComponentsModule,

        RouterModule.forChild(appRoutes)
    ],
    providers : [],
    declarations: [
        Nx503Component
    ],
    bootstrap      : [],
    entryComponents: [
        Nx503Component
    ],
    exports: [
        Nx503Component
    ]
})
export class Nx503Module {
}
