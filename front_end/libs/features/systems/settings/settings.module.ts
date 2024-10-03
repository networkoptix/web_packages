import { CommonModule } from '@angular/common';
import { inject, NgModule } from '@angular/core';
import {
    ActivatedRouteSnapshot,
    CanActivateFn,
    createUrlTreeFromSnapshot,
    ResolveFn,
    Router,
    RouterModule,
    RouterStateSnapshot,
    Routes,
} from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { firstValueFrom } from 'rxjs';

import { NxFooterComponent } from '@components/footer/footer.component';
import { NxPagePlaceholderComponent } from '@components/placeholders/page/page-placeholder.component';
import { NxPreLoaderComponent } from '@components/placeholders/pre-loader/pre-loader.component';
import { NxAddSvgSrcDirective } from '@directives/add-data.directive';
import { ApplyGuard } from '@guards/applyGuard';
import { AuthGuard } from '@guards/authGuard';
import { IsCloudGuard } from '@guards/environment.guard';
import { OrgStateGuard } from '@guards/orgStateGuard';
import { SystemGuard } from '@guards/systemGuard';
import { TwofaGuard } from '@guards/twofaGuard';
import { MenuModule } from '@menu/menu.module';
import { PipesModule } from '@pipes/pipes.module';
import { currentSystemResolver } from '@resolvers/current-system-resolver';
import { serverResolver } from '@resolvers/server-resolver';
import { SystemTitleResolver } from '@resolvers/system-title-resolver';
import { userResolver } from '@resolvers/user-resolver';
import { NxSystemCamera } from '@services/system.service/camera-manager/camera-manager-types';
import { NxSystemService } from '@services/system.service/system.service';

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

const cameraResolver: ResolveFn<NxSystemCamera> = async (
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot,
) => {
    const systemsService: NxSystemService = inject(NxSystemService);
    const router: Router = inject(Router);
    const currentSystem = systemsService.getCurrentSystem();
    const cameraId = route.params.cameraId;
    const ec2Camera = await firstValueFrom(currentSystem.mediaserver.getCamera(cameraId));
    if (ec2Camera) {
        return currentSystem.cameraManager.parseCamera(ec2Camera);
    }
    await router.navigateByUrl(createUrlTreeFromSnapshot(route, ['../']));
    return undefined;
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
                canDeactivate: [ApplyGuard],
                resolve: {
                    system: currentSystemResolver,
                    camera: cameraResolver,
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
        NxAddSvgSrcDirective,
    ],
    providers: [],
    declarations: [NxSystemSettingsComponent],
    bootstrap: [],
    exports: [NxSystemSettingsComponent],
})
export class NxSettingsModule {}
