import { NgModule }                          from '@angular/core';
import { CommonModule }                      from '@angular/common';
import { BrowserModule }                     from '@angular/platform-browser';
import { UpgradeModule } from '@angular/upgrade/static';
import { RouterModule, Routes }              from '@angular/router';

import { NgbModule } from '@ng-bootstrap/ng-bootstrap';

import { TranslateModule }  from '@ngx-translate/core';
import { ComponentsModule } from '../../components/components.module';

import { AuthGuard } from '../../routeGuards/authGuard';

import { NxHealthComponent } from './health.component';

const appRoutes: Routes = [
    {
        path    : 'health/:systemId', component: NxHealthComponent, canActivate: [AuthGuard]
    }
];

@NgModule({
    imports        : [
        CommonModule,
        BrowserModule,
        UpgradeModule,
        RouterModule,
        NgbModule,
        TranslateModule,
        ComponentsModule,

        RouterModule.forChild(appRoutes)
    ],
    providers      : [],
    declarations   : [
        NxHealthComponent
    ],
    bootstrap      : [],
    entryComponents: [
        NxHealthComponent
    ],
    exports: [
        NxHealthComponent
    ]
})
export class NxHealthModule {
}
