import { NgModule }                          from '@angular/core';
import { CommonModule }                      from '@angular/common';
import { BrowserModule }                     from '@angular/platform-browser';
import { downgradeComponent, UpgradeModule } from '@angular/upgrade/static';
import { RouterModule, Routes }              from '@angular/router';

import { NgbModule } from '@ng-bootstrap/ng-bootstrap';

import { NxSystemSettingsComponent } from './settings.component';

import { TranslateModule }  from '@ngx-translate/core';
import { ComponentsModule } from '../../../components/components.module';

import { NxSystemAdminModule }         from './admin/admin.module';
import { NxSystemUsersModule }         from './users/users.module';
import { NxSystemMergeStatusModule }   from './merge-status/merge-status.module';
import { NxSystemAdminComponent }      from './admin/admin.component';
import { NxSystemUsersComponent }      from './users/users.component';

const appRoutes: Routes = [
    // root path is handles by AJS for now
    {
        path    : 'systems/:systemId', component: NxSystemSettingsComponent,
        children: [
            { path: '', component: NxSystemAdminComponent },
            { path: 'users', component: NxSystemUsersComponent },
            { path: 'users/:userId', component: NxSystemUsersComponent },
        ]
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
        NxSystemMergeStatusModule,
        NxSystemAdminModule,
        NxSystemUsersModule,

        RouterModule.forChild(appRoutes)
    ],
    providers      : [],
    declarations   : [
        NxSystemSettingsComponent
    ],
    bootstrap      : [],
    entryComponents: [
        NxSystemSettingsComponent
    ],
    exports        : [
        NxSystemSettingsComponent
    ]
})
export class NxSettingsModule {
}

declare var angular: angular.IAngularStatic;
angular
        .module('cloudApp.directives')
        .directive('nxSystemSettingsComponent', downgradeComponent({ component: NxSystemSettingsComponent }) as angular.IDirectiveFactory);
