import { NgModule }                          from '@angular/core';
import { CommonModule }                      from '@angular/common';
import { BrowserModule }                     from '@angular/platform-browser';
import { downgradeComponent, UpgradeModule } from '@angular/upgrade/static';
import { RouterModule, Routes }              from '@angular/router';

import { NgbModule } from '@ng-bootstrap/ng-bootstrap';

import { NxSettingsComponent } from './settings.component';

import { TranslateModule }        from '@ngx-translate/core';
import { ComponentsModule }       from '../../../components/components.module';
import { NxSystemsListComponent } from '../list/list.component';
// import { NxOverviewComponent }  from './overview/overview.component';
// import { NxSetupComponent }     from './setup/setup.component';

// const appRoutes: Routes = [
//     {
//         path    : 'systems/:systemId', component: NxSettingsComponent,
//     }
// ];

@NgModule({
    imports        : [
        CommonModule,
        BrowserModule,
        UpgradeModule,
        RouterModule,
        NgbModule,
        TranslateModule,
        ComponentsModule,

        // RouterModule.forChild(appRoutes)
    ],
    providers      : [],
    declarations   : [
        NxSettingsComponent
    ],
    bootstrap      : [],
    entryComponents: [
        NxSettingsComponent
    ],
    exports        : [
        NxSettingsComponent
    ]
})
export class NxSettingsModule {
}

declare var angular: angular.IAngularStatic;
angular
        .module('cloudApp.directives')
        .directive('nxSettingsComponent', downgradeComponent({ component: NxSettingsComponent }) as angular.IDirectiveFactory);
