import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';

import { ApplyGuard } from '@guards/applyGuard';
import { AuthGuard } from '@guards/authGuard';
import { MenuModule } from '@menu/menu.module';
import { PipesModule } from '@pipes/pipes.module';
import { currentSystemResolver } from '@resolvers/current-system-resolver';

import { NxSystemAdminComponent } from './settings/admin/admin.component';
import { NxSystemAdminModule } from './settings/admin/admin.module';
import { NxCamerasComponent } from './settings/cameras/cameras.component';
import { NxCamerasModule } from './settings/cameras/cameras.module';
import { NxSystemLicensesComponent } from './settings/licenses/licenses.component';
import { NxSystemLicensesModule } from './settings/licenses/licenses.module';
import { NxSystemServersComponent } from './settings/servers/servers.component';
import { NxSystemServersModule } from './settings/servers/servers.module';
import { NxSystemSettingsComponent } from './settings/settings.component';
import { NxSettingsModule } from './settings/settings.module';
import { NxSystemUsersComponent } from './settings/users/users.component';
import { NxSystemUsersModule } from './settings/users/users.module';

export const localSettingsRoutes: Routes = [
    {
        path: '',
        component: NxSystemSettingsComponent,
        canActivate: [AuthGuard],
        resolve: { system: currentSystemResolver },
        runGuardsAndResolvers: 'always',
        children: [
            {
                path: '',
                component: NxSystemAdminComponent,
                canDeactivate: [ApplyGuard],
                resolve: { system: currentSystemResolver },
            },
            {
                path: 'advanced',
                component: NxSystemAdminComponent,
                canDeactivate: [ApplyGuard],
                runGuardsAndResolvers: 'always',
                resolve: { system: currentSystemResolver },
            },
            {
                path: 'users',
                component: NxSystemUsersComponent,
                canDeactivate: [ApplyGuard],
                runGuardsAndResolvers: 'always',
                resolve: { system: currentSystemResolver },
            },
            {
                path: 'users/:userId',
                component: NxSystemUsersComponent,
                canDeactivate: [ApplyGuard],
                runGuardsAndResolvers: 'always',
                resolve: { system: currentSystemResolver },
            },
            {
                path: 'servers',
                component: NxSystemServersComponent,
                canDeactivate: [ApplyGuard],
                runGuardsAndResolvers: 'always',
                resolve: { system: currentSystemResolver },
            },
            {
                path: 'servers/:serverId',
                component: NxSystemServersComponent,
                canDeactivate: [ApplyGuard],
                runGuardsAndResolvers: 'always',
                resolve: { system: currentSystemResolver },
            },
            {
                path: 'servers/:serverId/advanced',
                component: NxSystemServersComponent,
                canDeactivate: [ApplyGuard],
                resolve: { system: currentSystemResolver },
            },
            {
                path: 'cameras',
                component: NxCamerasComponent,
                canDeactivate: [ApplyGuard],
                runGuardsAndResolvers: 'always',
                resolve: { system: currentSystemResolver },
            },
            {
                path: 'cameras/:cameraId',
                component: NxCamerasComponent,
                canDeactivate: [ApplyGuard],
                runGuardsAndResolvers: 'always',
                resolve: { system: currentSystemResolver },
            },
            {
                path: 'licenses',
                component: NxSystemLicensesComponent,
                runGuardsAndResolvers: 'always',
                resolve: { system: currentSystemResolver },
            },
        ],
    },
];

@NgModule({
    imports: [
        CommonModule,
        RouterModule,
        RouterModule.forChild(localSettingsRoutes),
        TranslateModule,
        MenuModule,
        NxSystemAdminModule,
        NxSystemUsersModule,
        NxSystemServersModule,
        NxCamerasModule,
        NxSettingsModule,
        NxSystemLicensesModule,
        PipesModule,
    ],
    providers: [],
    declarations: [],
    bootstrap: [],
    exports: [],
})
export class NxSystemModule {}
