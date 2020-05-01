import { NgModule }                   from '@angular/core';
import { CommonModule }               from '@angular/common';
import { BrowserModule }              from '@angular/platform-browser';
import { UpgradeModule }              from '@angular/upgrade/static';
import { RouterModule, Routes }       from '@angular/router';
import { NgbModule }                  from '@ng-bootstrap/ng-bootstrap';
import { NxSystemSettingsComponent }  from './settings.component';
import { TranslateModule }            from '@ngx-translate/core';
import { ComponentsModule }           from '../../../components/components.module';
import { NxSystemAdminModule }        from './admin/admin.module';
import { NxSystemUsersModule }        from './users/users.module';
import { NxSystemServersModule }      from './servers/servers.module';
import { NxSystemAdminComponent }     from './admin/admin.component';
import { NxSystemUsersComponent }     from './users/users.component';
import { NxSystemServersComponent }   from './servers/servers.component';
import { NxNoSystemsComponent }       from '../no-systems/no-systems.component';
import { ApplyGuard }                 from '../../../routeGuards/applyGuard';
import { AuthGuard }                  from '../../../routeGuards/authGuard';
import { SystemGuard }                from '../../../routeGuards/systemGuard';
import { NxCloudStorageModule }       from './cloud-storage/cloud-storage.module';
import { NxCloudStorageComponent }    from './cloud-storage/cloud-storage.component';
import { NxCamerasComponent }         from './cameras/cameras.component';
import { NxCamerasModule }            from './cameras/cameras.module';

const appRoutes: Routes = [
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
        RouterModule.forChild(appRoutes)
    ],
    providers: [
        ApplyGuard
    ],
    declarations: [
        NxSystemSettingsComponent,
        NxNoSystemsComponent
    ],
    bootstrap: [],
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
