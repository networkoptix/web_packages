import { NgModule }                          from '@angular/core';
import { CommonModule }                      from '@angular/common';
import { BrowserModule }                     from '@angular/platform-browser';
import { downgradeComponent, UpgradeModule } from '@angular/upgrade/static';
import { RouterModule, Routes }              from '@angular/router';

import { NxLandingComponent }                from './landing.component';

import { TranslateModule }                   from '@ngx-translate/core';
import { ComponentsModule }                  from '../../components/components.module';
import { DirectivesModule }                  from '../../directives/directives.module';

const appRoutes: Routes = [
    { path    : '', component: NxLandingComponent },
    { path    : 'login', component: NxLandingComponent },
    { path    : 'logout', component: NxLandingComponent }
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
        NxLandingComponent,
    ],
    bootstrap      : [],
    entryComponents: [
        NxLandingComponent
    ],
    exports        : [
        NxLandingComponent
    ]
})
export class LandingModule {
}

