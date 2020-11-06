import { NgModule }             from '@angular/core';
import { CommonModule }         from '@angular/common';
import { RouterModule, Routes } from '@angular/router';

import { DirectivesModule }             from '../../directives/directives.module';
import { NonSupportedBrowserComponent } from './non-supported-browser.component';

const appRoutes: Routes = [
    { path: 'browser', component: NonSupportedBrowserComponent }
];

@NgModule({
    imports: [
        CommonModule,
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
