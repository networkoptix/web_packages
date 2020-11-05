import { NgModule }             from '@angular/core';
import { CommonModule }         from '@angular/common';
import { BrowserModule }        from '@angular/platform-browser';
import { UpgradeModule }        from '@angular/upgrade/static';
import { RouterModule, Routes } from '@angular/router';

import { DirectivesModule }             from '../../directives/directives.module';
import { NonSupportedBrowserComponent } from './non-supported-browser.component';

const appRoutes: Routes = [
    { path: 'browser', component: NonSupportedBrowserComponent }
];

@NgModule({
    imports: [
        CommonModule,
        BrowserModule,
        UpgradeModule,
        DirectivesModule,
        RouterModule.forChild(appRoutes)
    ],
    providers : [],
    declarations : [
        NonSupportedBrowserComponent
    ],
    bootstrap : [],
    exports: [
        NonSupportedBrowserComponent
    ]
})
export class NonSupportedBrowserModule {
}
