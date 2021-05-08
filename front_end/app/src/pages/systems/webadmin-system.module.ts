import { NgModule }                         from '@angular/core';
import { CommonModule }                     from '@angular/common';
import { RouterModule, Routes }             from '@angular/router';
import { NgbModule }                        from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule }                  from '@ngx-translate/core';

import { ComponentsModule }                 from '../../components/components.module';
import { NxSystemAdminModule }              from './settings/admin/admin.module';
import { NxSystemUsersModule }              from './settings/users/users.module';
import { NxSystemServersModule }            from './settings/servers/servers.module';
import { NxCamerasModule }                  from './settings/cameras/cameras.module';
import { NxSystemLicensesModule }           from './settings/licenses/licenses.module';
import { NxSystemSettingsComponent }        from './settings/settings.component';
import { NxSystemAdminComponent }           from './settings/admin/admin.component';
import { NxSystemUsersComponent }           from './settings/users/users.component';
import { NxSystemServersComponent }         from './settings/servers/servers.component';
import {
    ApplyGuard, AuthGuard, SystemGuard
}                                           from '../../routeGuards';
import { NxCamerasComponent }               from './settings/cameras/cameras.component';
import { MenuModule }                       from '../../menu';
import { NxSystemLicensesComponent }        from './settings/licenses/licenses.component';

export const localSettingsRoutes: Routes = [
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
                path          : 'advanced',
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
        NxSystemAdminModule,
        NxSystemUsersModule,
        NxSystemServersModule,
        NxCamerasModule,
        NxSystemLicensesModule,
        RouterModule.forChild(localSettingsRoutes),
        MenuModule
    ],
    providers: [],
    declarations: [
    ],
    bootstrap: [
    ],
    exports: [
    ]
})
export class NxSystemModule {
}
