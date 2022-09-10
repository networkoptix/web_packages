import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';

import { ComponentsModule } from '@components/components.module';
import { ApplyGuard } from '@guards/applyGuard';
import { AuthGuard } from '@guards/authGuard';
import { MenuModule } from '@src/menu/menu.module';
import { PipesModule } from '@src/pipes/pipes.module';

import { NxSystemAdminComponent } from './settings/admin/admin.component';
import { NxSystemAdminModule } from './settings/admin/admin.module';
import { NxCamerasComponent } from './settings/cameras/cameras.component';
import { NxCamerasModule } from './settings/cameras/cameras.module';
import { NxSystemLicensesComponent } from './settings/licenses/licenses.component';
import { NxSystemLicensesModule } from './settings/licenses/licenses.module';
import { NxSystemServersComponent } from './settings/servers/servers.component';
import { NxSystemServersModule } from './settings/servers/servers.module';
import { NxSystemSettingsComponent } from './settings/settings.component';
import { NxSystemUsersComponent } from './settings/users/users.component';
import { NxSystemUsersModule } from './settings/users/users.module';

export const localSettingsRoutes: Routes = [
    {
        path: '',
        component: NxSystemSettingsComponent,
        canActivate: [AuthGuard],
        runGuardsAndResolvers: 'always',
        children: [
            {
                path: '',
                component: NxSystemAdminComponent,
                canDeactivate: [ApplyGuard]
            },
            {
                path: 'advanced',
                component: NxSystemAdminComponent,
                canDeactivate: [ApplyGuard],
                runGuardsAndResolvers: 'always'
            },
            {
                path: 'users',
                component: NxSystemUsersComponent,
                canDeactivate: [ApplyGuard],
                runGuardsAndResolvers: 'always'
            },
            {
                path: 'users/:userId',
                component: NxSystemUsersComponent,
                canDeactivate: [ApplyGuard],
                runGuardsAndResolvers: 'always'
            },
            {
                path: 'servers',
                component: NxSystemServersComponent,
                canDeactivate: [ApplyGuard],
                runGuardsAndResolvers: 'always'
            },
            {
                path: 'servers/:serverId',
                component: NxSystemServersComponent,
                canDeactivate: [ApplyGuard],
                runGuardsAndResolvers: 'always'
            },
            {
                path: 'servers/:serverId/advanced',
                component: NxSystemServersComponent,
                canDeactivate: [ApplyGuard]
            },
            {
                path: 'cameras',
                component: NxCamerasComponent,
                canDeactivate: [ApplyGuard],
                runGuardsAndResolvers: 'always'
            },
            {
                path: 'cameras/:cameraId',
                component: NxCamerasComponent,
                canDeactivate: [ApplyGuard],
                runGuardsAndResolvers: 'always'
            },
            {
                path: 'licenses',
                component: NxSystemLicensesComponent,
                runGuardsAndResolvers: 'always'
            }
        ]
    }
];

@NgModule({
    imports: [
        CommonModule,
        RouterModule,
        TranslateModule,
        ComponentsModule,
        PipesModule,
        NxSystemAdminModule,
        NxSystemUsersModule,
        NxSystemServersModule,
        NxCamerasModule,
        NxSystemLicensesModule,
        RouterModule.forChild(localSettingsRoutes),
        MenuModule
    ],
    providers: [
    ],
    declarations: [
    ],
    bootstrap: [
    ],
    exports: [
    ]
})
export class NxSystemModule {
}
