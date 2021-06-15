import { NgModule }                  from '@angular/core';
import { CommonModule }              from '@angular/common';
import { RouterModule, Routes }      from '@angular/router';
import { NgbModule }                 from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule }           from '@ngx-translate/core';
import { ComponentsModule }          from '@components/components.module';
import {
    ApplyGuard, AuthGuard, SystemGuard
}                                    from '../../../routeGuards';
import { MenuModule }                from '@src/menu';
import { NxSystemLicensesComponent } from './licenses/licenses.component';
import { NxSystemLicensesModule }    from './licenses/licenses.module';
import { NxSystemSettingsComponent } from './settings.component';
import { NxSystemAdminComponent }    from './admin/admin.component';
import { NxSystemUsersComponent }    from './users/users.component';
import { NxSystemServersComponent }  from './servers/servers.component';
import { NxCamerasComponent }        from './cameras/cameras.component';
import { NxCloudStorageComponent }   from './cloud-storage/cloud-storage.component';
import { NxSystemAdminModule }       from './admin/admin.module';
import { NxSystemUsersModule }       from './users/users.module';
import { NxSystemServersModule }     from './servers/servers.module';
import { NxCamerasModule }           from './cameras/cameras.module';
import { NxCloudStorageModule }      from './cloud-storage/cloud-storage.module';
import { NxSettingsService }         from './settings.service';
import { PipesModule }               from '@src/pipes/pipes.module';

export const cloudSettingsRoutes: Routes = [
    // root path is handles by AJS for now
    {
        path        : '',
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
        RouterModule,
        NgbModule,
        TranslateModule,
        ComponentsModule,
        PipesModule,
        NxSystemAdminModule,
        NxSystemUsersModule,
        NxSystemServersModule,
        NxCloudStorageModule,
        NxSystemLicensesModule,
        NxCamerasModule,
        MenuModule,
        RouterModule.forChild(cloudSettingsRoutes)
    ],
    providers: [
        NxSettingsService
    ],
    declarations: [
        NxSystemSettingsComponent
    ],
    bootstrap: [
    ],
    exports: [
        NxSystemSettingsComponent
    ]
})
export class NxSettingsModule {
}
