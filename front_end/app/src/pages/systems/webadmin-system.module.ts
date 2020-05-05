import { NgModule }                         from '@angular/core';
import { CommonModule }                     from '@angular/common';
import { BrowserModule }                    from '@angular/platform-browser';
import { UpgradeModule }                    from '@angular/upgrade/static';
import { RouterModule, Routes }             from '@angular/router';
import { NgbModule }                        from '@ng-bootstrap/ng-bootstrap';
import { NxSystemSettingsComponent }        from './settings/settings.component';
import { TranslateModule }                  from '@ngx-translate/core';
import { ComponentsModule }                 from '../../components/components.module';
import { NxSystemAdminModule }              from './settings/admin/admin.module';
import { NxSystemUsersModule }              from './settings/users/users.module';
import { NxSystemServersModule }            from './settings/servers/servers.module';
import { NxSystemAdminComponent }           from './settings/admin/admin.component';
import { NxSystemUsersComponent }           from './settings/users/users.component';
import { NxSystemServersComponent }         from './settings/servers/servers.component';
import { NxNoSystemsComponent }             from './no-systems/no-systems.component';
import { ApplyGuard, AuthGuard, SystemGuard } from '../../routeGuards';
import { NxCamerasComponent } from './settings/cameras/cameras.component';
import { NxCamerasModule } from './settings/cameras/cameras.module';

const appRoutes: Routes = [
    // root path is handles by AJS for now
    {
        path        : 'settings',
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
export class NxSystemModule {
}
