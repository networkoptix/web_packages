import { NgModule }             from '@angular/core';
import { CommonModule }         from '@angular/common';
import { BrowserModule }        from '@angular/platform-browser';
import {
    downgradeComponent, UpgradeModule
}                               from '@angular/upgrade/static';
import { RouterModule, Routes } from '@angular/router';


import {
    NonSupportedBrowserComponent
}                               from './non-supported-browser.component';
import { DirectivesModule }     from '../../directives/directives.module';

const appRoutes: Routes = [
    {path: 'browser', component: NonSupportedBrowserComponent},
];

@NgModule({
    imports: [
        CommonModule,
        BrowserModule,
        UpgradeModule,
        DirectivesModule,
        RouterModule.forChild(appRoutes)
    ],
    providers: [],
    declarations: [
        NonSupportedBrowserComponent,
    ],
    bootstrap: [],
    entryComponents:[
        NonSupportedBrowserComponent
    ],
    exports: [
        NonSupportedBrowserComponent
    ]
})
export class NonSupportedBrowserModule {
}
