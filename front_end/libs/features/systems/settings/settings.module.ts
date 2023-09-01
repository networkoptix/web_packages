import { CommonModule } from '@angular/common';
import { NgModule, inject } from '@angular/core';
import {
    ActivatedRouteSnapshot,
    CanActivateFn,
    ResolveFn,
    Router,
    RouterModule,
    RouterStateSnapshot,
    Routes,
    createUrlTreeFromSnapshot,
} from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';

import { NxFooterComponent } from '@components/footer/footer.component';
import { NxPagePlaceholderComponent } from '@components/placeholders/page/page-placeholder.component';
import { NxPreLoaderComponent } from '@components/placeholders/pre-loader/pre-loader.component';
import { NxAddSvgSrcDirective } from '@directives/add-data.directive';
import { ApplyGuard } from '@guards/applyGuard';
import { AuthGuard } from '@guards/authGuard';
import { SystemGuard } from '@guards/systemGuard';
import { TwofaGuard } from '@guards/twofaGuard';
import { MenuModule } from '@menu/menu.module';
import { PipesModule } from '@pipes/pipes.module';
import { currentSystemResolver } from '@resolvers/current-system-resolver';
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
    if (currentSystem.cameraManager.cameras?.length) {
        const cameraId = currentSystem.cameraManager.cameras[0].id;
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
    const ec2Camera = await currentSystem.mediaserver.getCamera(cameraId).toPromise();
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
                redirectTo: 'users/',
            },
            {
                path: 'users/:userId',
                title: SystemTitleResolver,
                component: NxSystemUsersComponent,
                canDeactivate: [ApplyGuard],
                resolve: {
                    system: currentSystemResolver,
                    user: userResolver,
                },
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
        NxAddSvgSrcDirective,
    ],
    providers: [],
    declarations: [NxSystemSettingsComponent],
    bootstrap: [],
    exports: [NxSystemSettingsComponent],
})
export class NxSettingsModule {}
