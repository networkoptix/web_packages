import { NgModule }                   from '@angular/core';
import { CommonModule }               from '@angular/common';
import { BrowserModule }              from '@angular/platform-browser';
import { UpgradeModule }              from '@angular/upgrade/static';
import { RouterModule, Routes }       from '@angular/router';
import { NgbModule }                  from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule }            from '@ngx-translate/core';
import { ComponentsModule }           from '../../../components/components.module';
import { NxNoSystemsComponent }       from '../no-systems/no-systems.component';
import { MenuModule }                 from '../../../menu';
import {
    ApplyGuard, AuthGuard, SystemGuard
}                                     from '../../../routeGuards';
import {
    NxSystemSettingsComponent,
    NxSystemAdminModule, NxSystemAdminComponent,
    NxCamerasModule, NxCamerasComponent,
    NxCloudStorageModule, NxCloudStorageComponent,
    NxSystemServersModule, NxSystemServersComponent,
    NxSystemUsersModule, NxSystemUsersComponent
}                                             from './';
import { NxSystemLicensesComponent }          from './licenses/licenses.component';
import { NxSystemLicensesModule }             from './licenses/licenses.module';

export const cloudSettingsRoutes: Routes = [
    // root path is handles by AJS for now
    {
        path        : 'systems/:systemId',
        component   : NxSystemSettingsComponent,
        canActivate : [AuthGuard],
        children    : [
            {
                path          : '',
                component     : NxSystemAdminComponent,
                canDeactivate : [ApplyGuard]
            },
            {
                path          : 'users',
                component     : NxSystemUsersComponent,
                canDeactivate : [ApplyGuard],
                canActivate   : [SystemGuard]
            },
            {
                path          : 'users/:userId',
                component     : NxSystemUsersComponent,
                canDeactivate : [ApplyGuard],
                canActivate   : [SystemGuard]
            },
            {
                path          : 'servers',
                component     : NxSystemServersComponent,
                canDeactivate : [ApplyGuard]
            },
            {
                path          : 'servers/:serverId',
                component     : NxSystemServersComponent,
                canDeactivate : [ApplyGuard]
            },
            {
                path          : 'cameras',
                component     : NxCamerasComponent,
                canDeactivate : [ApplyGuard]
            },
            {
                path          : 'cameras/:cameraId',
                component     : NxCamerasComponent,
                canDeactivate : [ApplyGuard]
            },
            {
                path          : 'cloud-storage',
                component     : NxCloudStorageComponent,
                canActivate   : [SystemGuard],
                canDeactivate : [ApplyGuard]
            },
            {
                path        : 'licenses',
                component   : NxSystemLicensesComponent,
                canActivate : [SystemGuard]
            }
        ]
    }
];

@NgModule({
    imports: [
        CommonModule,
        BrowserModule,
        UpgradeModule,
        RouterModule,
        NgbModule,
        TranslateModule,
        ComponentsModule,
        NxSystemAdminModule,
        NxSystemUsersModule,
        NxSystemServersModule,
        NxCamerasModule,
        NxCloudStorageModule,
        NxSystemLicensesModule,
        MenuModule,
        RouterModule.forChild(appRoutes)
    ],
    providers: [
        ApplyGuard
    ],
    declarations: [
        NxSystemSettingsComponent,
        NxNoSystemsComponent
    ],
    bootstrap       : [],
    entryComponents : [
        NxSystemSettingsComponent
    ],
    exports: [
        NxSystemSettingsComponent,
        NxNoSystemsComponent
    ]
})
export class NxSettingsModule {
}
