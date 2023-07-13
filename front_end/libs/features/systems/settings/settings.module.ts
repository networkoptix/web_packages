import { CommonModule } from '@angular/common';
import { NgModule, inject } from '@angular/core';
import {
    ActivatedRouteSnapshot,
    CanActivateFn,
    Router,
    RouterModule,
    RouterStateSnapshot,
    Routes,
} from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';

import { MenuModule } from '@app/menu/menu.module';
import { PipesModule } from '@app/pipes/pipes.module';
import { NxSystemService } from '@app/services/system.service/system.service';
import { NxFooterComponent } from '@components/footer/footer.component';
import { NxPagePlaceholderComponent } from '@components/placeholders/page/page-placeholder.component';
import { NxPreLoaderComponent } from '@components/placeholders/pre-loader/pre-loader.component';
import { ApplyGuard } from '@guards/applyGuard';
import { AuthGuard } from '@guards/authGuard';
import { SystemGuard } from '@guards/systemGuard';
import { TwofaGuard } from '@guards/twofaGuard';
import { currentSystemResolver } from '@resolvers/current-system-resolver';
import { SystemTitleResolver } from '@resolvers/system-title-resolver';
import { cleanId } from '@utils/general';

import { NxSystemAdminComponent } from './admin/admin.component';
import { NxSystemAdminModule } from './admin/admin.module';
import { NxCamerasComponent } from './cameras/cameras.component';
import { NxCamerasModule } from './cameras/cameras.module';
import { NxNoCamerasComponent } from './cameras/no-cameras-settings/no-cameras.component';
import { NxCloudStorageComponent } from './cloud-storage/cloud-storage.component';
import { NxCloudStorageModule } from './cloud-storage/cloud-storage.module';
import { NxSystemLicensesComponent } from './licenses/licenses.component';
import { NxSystemLicensesModule } from './licenses/licenses.module';
import { NxSystemServersComponent } from './servers/servers.component';
import { NxSystemServersModule } from './servers/servers.module';
import { NxSystemSettingsComponent } from './settings.component';
import { NxSystemUsersComponent } from './users/users.component';
import { NxSystemUsersModule } from './users/users.module';

const camerasExistActivator: CanActivateFn = async (
    _: ActivatedRouteSnapshot,
    state: RouterStateSnapshot,
) => {
    const router: Router = inject(Router);
    const systemsService: NxSystemService = inject(NxSystemService);
    const currentSystem = systemsService.getCurrentSystem();
    if (currentSystem.cameraManager.cameras?.length) {
        const cameraId = cleanId(currentSystem.cameraManager.cameras[0].id);
        router.navigate([state.url, cameraId]);
        return false;
    }
    return true;
};

export const cloudSettingsRoutes: Routes = [
    {
        path: '',
        component: NxSystemSettingsComponent,
        canActivate: [AuthGuard, SystemGuard, TwofaGuard],
        resolve: { system: currentSystemResolver },
        children: [
            {
                path: '',
                title: SystemTitleResolver,
                component: NxSystemAdminComponent,
                canDeactivate: [ApplyGuard],
                resolve: { system: currentSystemResolver },
            },
            {
                path: 'advanced',
                title: SystemTitleResolver,
                component: NxSystemAdminComponent,
                canDeactivate: [ApplyGuard],
                resolve: { system: currentSystemResolver },
            },
            {
                path: 'users',
                title: SystemTitleResolver,
                component: NxSystemUsersComponent,
                canDeactivate: [ApplyGuard],
                resolve: { system: currentSystemResolver },
            },
            {
                path: 'users/:userId',
                title: SystemTitleResolver,
                component: NxSystemUsersComponent,
                canDeactivate: [ApplyGuard],
                resolve: { system: currentSystemResolver },
            },
            {
                path: 'servers',
                title: SystemTitleResolver,
                component: NxSystemServersComponent,
                canDeactivate: [ApplyGuard],
                resolve: { system: currentSystemResolver },
            },
            {
                path: 'servers/:serverId',
                title: SystemTitleResolver,
                component: NxSystemServersComponent,
                canDeactivate: [ApplyGuard],
                resolve: { system: currentSystemResolver },
            },
            {
                path: 'servers/:serverId/advanced',
                title: SystemTitleResolver,
                component: NxSystemServersComponent,
                canDeactivate: [ApplyGuard],
                resolve: { system: currentSystemResolver },
            },
            {
                path: 'cameras',
                title: SystemTitleResolver,
                component: NxNoCamerasComponent,
                canDeactivate: [ApplyGuard],
                canActivate: [camerasExistActivator],
                resolve: {
                    system: currentSystemResolver,
                },
            },
            {
                path: 'cameras/:cameraId',
                title: SystemTitleResolver,
                component: NxCamerasComponent,
                canDeactivate: [ApplyGuard],
                resolve: { system: currentSystemResolver },
            },
            {
                path: 'cloud-storage',
                title: SystemTitleResolver,
                component: NxCloudStorageComponent,
                canDeactivate: [ApplyGuard],
                resolve: { system: currentSystemResolver },
            },
            {
                path: 'licenses',
                title: SystemTitleResolver,
                resolve: { system: currentSystemResolver },
                component: NxSystemLicensesComponent,
            },
        ],
    },
];

@NgModule({
    imports: [
        CommonModule,
        RouterModule,
        RouterModule.forChild(cloudSettingsRoutes),
        TranslateModule,
        NxFooterComponent,
        MenuModule,
        NxSystemAdminModule,
        NxSystemUsersModule,
        NxSystemServersModule,
        NxCloudStorageModule,
        NxSystemLicensesModule,
        NxCamerasModule,
        NxPagePlaceholderComponent,
        PipesModule,
        NxPreLoaderComponent,
    ],
    providers: [],
    declarations: [NxSystemSettingsComponent],
    bootstrap: [],
    exports: [NxSystemSettingsComponent],
})
export class NxSettingsModule {}
