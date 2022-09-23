import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';

import { MenuModule } from '@app/menu/menu.module';
import { PipesModule } from '@app/pipes/pipes.module';
import { ComponentsModule } from '@components/components.module';
import { FooterModule } from '@components/footer/footer.module';
import { PagePlaceHolderModule } from '@components/placeholders/page/page-placeholder.module';
import { ApplyGuard } from '@guards/applyGuard';
import { AuthGuard } from '@guards/authGuard';
import { SystemGuard } from '@guards/systemGuard';
import { TwofaGuard } from '@guards/twofaGuard';

import { NxSystemAdminComponent } from './admin/admin.component';
import { NxSystemAdminModule } from './admin/admin.module';
import { NxCamerasComponent } from './cameras/cameras.component';
import { NxCamerasModule } from './cameras/cameras.module';
import { NxCloudStorageComponent } from './cloud-storage/cloud-storage.component';
import { NxCloudStorageModule } from './cloud-storage/cloud-storage.module';
import { NxSystemLicensesComponent } from './licenses/licenses.component';
import { NxSystemLicensesModule } from './licenses/licenses.module';
import { NxSystemServersComponent } from './servers/servers.component';
import { NxSystemServersModule } from './servers/servers.module';
import { NxSystemSettingsComponent } from './settings.component';
import { NxSettingsService } from './settings.service';
import { NxSystemUsersComponent } from './users/users.component';
import { NxSystemUsersModule } from './users/users.module';

export const cloudSettingsRoutes: Routes = [
    {
        path: '',
        component: NxSystemSettingsComponent,
        canActivate: [AuthGuard, TwofaGuard],
        children: [
            {
                path: '',
                component: NxSystemAdminComponent,
                canDeactivate: [ApplyGuard]
            },
            {
                path: 'advanced',
                component: NxSystemAdminComponent,
                canDeactivate: [ApplyGuard]
            },
            {
                path: 'users',
                component: NxSystemUsersComponent,
                canDeactivate: [ApplyGuard]
            },
            {
                path: 'users/:userId',
                component: NxSystemUsersComponent,
                canDeactivate: [ApplyGuard]
            },
            {
                path: 'servers',
                component: NxSystemServersComponent,
                canDeactivate: [ApplyGuard]
            },
            {
                path: 'servers/:serverId',
                component: NxSystemServersComponent,
                canDeactivate: [ApplyGuard]
            },
            {
                path: 'servers/:serverId/advanced',
                component: NxSystemServersComponent,
                canDeactivate: [ApplyGuard]
            },
            {
                path: 'cameras',
                component: NxCamerasComponent,
                canDeactivate: [ApplyGuard]
            },
            {
                path: 'cameras/:cameraId',
                component: NxCamerasComponent,
                canDeactivate: [ApplyGuard]
            },
            {
                path: 'cloud-storage',
                canActivate: [SystemGuard],
                component: NxCloudStorageComponent,
                canDeactivate: [ApplyGuard]
            },
            {
                path: 'licenses',
                component: NxSystemLicensesComponent
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
        NxCloudStorageModule,
        NxSystemLicensesModule,
        NxCamerasModule,
        MenuModule,
        RouterModule.forChild(cloudSettingsRoutes),
        PagePlaceHolderModule,
        FooterModule
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
