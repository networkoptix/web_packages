import { NgModule }             from '@angular/core';
import { CommonModule }         from '@angular/common';
import { BrowserModule }        from '@angular/platform-browser';
import { UpgradeModule }        from '@angular/upgrade/static';
import { RouterModule, Routes } from '@angular/router';
import { TranslateModule }      from '@ngx-translate/core';


import { ComponentsModule }     from '../../components/components.module';
import { DirectivesModule }     from '../../directives/directives.module';
import { NxLandingComponent }   from '../landing/landing.component';
import { NxContentComponent }   from './content.component';

const appRoutes: Routes = [
    { path: 'content/about', component: NxLandingComponent },
    { path: 'content/:article_param', component: NxContentComponent },
    { path: 'agreement', component: NxContentComponent }
];

@NgModule({
    imports: [
        CommonModule,
        BrowserModule,
        UpgradeModule,
        TranslateModule,
        ComponentsModule,
        DirectivesModule,
        RouterModule.forChild(appRoutes)
    ],
    providers    : [],
    declarations : [
        NxContentComponent
    ],
    bootstrap      : [],
    entryComponents: [
        NxContentComponent
    ],
    exports        : [
        NxContentComponent
    ]
})
export class ContentModule {
}
