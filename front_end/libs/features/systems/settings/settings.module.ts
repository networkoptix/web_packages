import { CommonModule } from '@angular/common';
import { inject, NgModule } from '@angular/core';
import {
    ActivatedRouteSnapshot,
    CanActivateFn,
    createUrlTreeFromSnapshot,
    Router,
    RouterModule,
    RouterStateSnapshot,
    Routes,
    type UrlTree,
} from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { AngularSvgIconModule } from 'angular-svg-icon';
import { firstValueFrom } from 'rxjs';

import { NxFooterComponent } from '@components/footer/footer.component';
import { NxPagePlaceholder404Component } from '@components/placeholders/404/404-page-placeholder.component';
import { NxPagePlaceholderFailed2faAccessComponent } from '@components/placeholders/failed-2fa-access/failed-2fa-access-page-placeholder.component';
import { NxPagePlaceholderFailedSystemAccessComponent } from '@components/placeholders/failed-system-access/failed-system-access-page-placeholder.component';
import { NxPagePlaceholderGenericComponent } from '@components/placeholders/generic-page-placeholder.component';
import { NxPreLoaderComponent } from '@components/placeholders/pre-loader/pre-loader.component';
import { ToastType } from '@components/toast-container/toast.types';
import { NxAddSvgSrcDirective } from '@directives/add-data.directive';
import { ApplyGuard } from '@guards/applyGuard';
import { AuthGuard } from '@guards/authGuard';
import { IsCloudGuard } from '@guards/environment.guard';
import { OrgStateGuard } from '@guards/orgStateGuard';
import { SystemGuard } from '@guards/systemGuard';
import { TwofaGuard } from '@guards/twofaGuard';
import staticLang from '@language_static';
import { MenuModule } from '@menu/menu.module';
import { PipesModule } from '@pipes/pipes.module';
import { currentSystemResolver } from '@resolvers/current-system-resolver';
import { serverResolver } from '@resolvers/server-resolver';
import { SystemTitleResolver } from '@resolvers/system-title-resolver';
import { userResolver } from '@resolvers/user-resolver';
import { NxSystemService } from '@services/system.service/system.service';
import { NxToastService } from '@services/toast.service';
import { NxMenuProjectionDirective } from 'nx-components';

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
import { NxUpdateWebadminComponent } from './update-webadmin/update-webadmin.component';
import { NxSystemUsersComponent } from './users/users.component';
import { NxSystemUsersModule } from './users/users.module';

const camerasExistActivator: CanActivateFn = async (
    _: ActivatedRouteSnapshot,
    state: RouterStateSnapshot,
) => {
    const router: Router = inject(Router);
    const systemsService: NxSystemService = inject(NxSystemService);
    const currentSystem = systemsService.getCurrentSystem();
    const editableCameras = currentSystem?.cameraManager.cameras?.filter(({ id }) =>
        currentSystem.permissionManager.canEditDevice(id),
    );
    if (editableCameras?.length) {
        const cameraId = editableCameras[0].id;
        router.navigate([state.url, cameraId]);
        return false;
    }
    return true;
};

const CanEditAndDataLoadedGuard: CanActivateFn = async (route: ActivatedRouteSnapshot) => {
    const toastService = inject(NxToastService);
    const redirectToBaseCamera = (): UrlTree => {
        toastService.notify(staticLang.errorCodes.failedToAccessCamera, ToastType.Warning);
        return createUrlTreeFromSnapshot(route, ['../']);
    };

    const systemsService: NxSystemService = inject(NxSystemService);
    const currentSystem = systemsService.getCurrentSystem();
    const cameraId = route.params.cameraId;
    if (!currentSystem.permissionManager.canEditDevice(cameraId)) {
        return redirectToBaseCamera();
    }
    const ec2Camera = await firstValueFrom(currentSystem.mediaserver.getCamera(cameraId));
    if (!ec2Camera) {
        return redirectToBaseCamera();
    }
    const parsedCamera = currentSystem.cameraManager.parseCamera(ec2Camera);
    route.data = { ...route.data, guardedCamera: parsedCamera };
    return true;
};
export const cloudSettingsRoutes: Routes = [
    {
        path: '',
        component: NxSystemSettingsComponent,
        canActivate: [AuthGuard, OrgStateGuard, SystemGuard, TwofaGuard],
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
                data: {
                    advanced: true,
                },
            },
            {
                path: 'users',
                redirectTo: 'users/',
            },
            {
                path: 'users/:userId',
                title: SystemTitleResolver,
                component: NxSystemUsersComponent,
                canDeactivate: [(component: NxSystemUsersComponent) => component.canNavigate()],
                resolve: {
                    system: currentSystemResolver,
                    user: userResolver,
                },
            },
            {
                path: 'servers',
                redirectTo: 'servers/',
            },
            {
                path: 'servers/:serverId',
                title: SystemTitleResolver,
                component: NxSystemServersComponent,
                canActivate: [SystemGuard],
                canDeactivate: [ApplyGuard],
                resolve: { system: currentSystemResolver, server: serverResolver },
            },
            {
                path: 'servers/:serverId/advanced',
                title: SystemTitleResolver,
                component: NxSystemServersComponent,
                canActivate: [SystemGuard],
                canDeactivate: [ApplyGuard],
                resolve: { system: currentSystemResolver, server: serverResolver },
                data: {
                    advanced: true,
                },
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
                canActivate: [CanEditAndDataLoadedGuard],
                canDeactivate: [ApplyGuard],
                resolve: {
                    system: currentSystemResolver,
                    camera: route => route.data.guardedCamera,
                },
                runGuardsAndResolvers: 'pathParamsChange',
            },
            {
                path: 'cloud-storage',
                title: SystemTitleResolver,
                component: NxCloudStorageComponent,
                canDeactivate: [ApplyGuard],
                canActivate: [IsCloudGuard],
                resolve: { system: currentSystemResolver },
            },
            {
                path: 'licenses',
                title: SystemTitleResolver,
                canActivate: [SystemGuard],
                resolve: { system: currentSystemResolver },
                component: NxSystemLicensesComponent,
            },
            {
                path: 'update-webadmin',
                title: SystemTitleResolver,
                resolve: { system: currentSystemResolver },
                component: NxUpdateWebadminComponent,
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
        NxUpdateWebadminComponent,
        NxCamerasModule,
        PipesModule,
        NxPreLoaderComponent,
        NxAddSvgSrcDirective,
        NxMenuProjectionDirective,
        NxPagePlaceholderGenericComponent,
        AngularSvgIconModule,
        NxPagePlaceholder404Component,
        NxPagePlaceholderFailed2faAccessComponent,
        NxPagePlaceholderFailedSystemAccessComponent,
    ],
    providers: [],
    declarations: [NxSystemSettingsComponent],
    bootstrap: [],
    exports: [NxSystemSettingsComponent],
})
export class NxSettingsModule {}
