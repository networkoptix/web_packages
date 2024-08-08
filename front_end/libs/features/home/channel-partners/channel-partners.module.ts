import { inject, NgModule } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivateFn, RouterModule, Routes } from '@angular/router';
import { Store } from '@ngrx/store';
import { of } from 'rxjs';
import { filter, switchMap } from 'rxjs/operators';

import { NxReportsComponent } from '@pages/home/components/reports/reports.component';
import { Mode } from '@pages/home/components/reports/reports.types';
import { updateParentPartnerId } from '@pages/home/resolvers/update-parent-partner-guard';
import { nxConfig } from '@services/nx-config/config';
import * as CPActions from '@store/channel-partners/channel-partners.actions';
import * as CPSelectors from '@store/channel-partners/channel-partners.selectors';

import { NxChannelPartnerInformationComponent } from '../components/information/information.component';
import { NxChannelPartnersSettingsComponent } from '../components/settings/channel-partners-settings/channel-partners-settings.component';
import { NxSubchannelsComponent } from '../components/subchannels/subchannels.component';
import { NxChannelPartnerUsersComponent } from '../components/users/channel-partner-users/channel-partner-users.component';
import { cpTabGuard } from '../resolvers/CP-tab-guard';
import { ChannelPartnerGuard } from '../resolvers/channel-partner-guard';
import { WithParentDataResolver } from '../resolvers/data-resolver';
import { withTabReporterResolver } from '../resolvers/tab-id-reporter-resolver';

import { NxChannelPartnersComponent } from './channel-partners.component';

const setPartnerId: CanActivateFn = (route: ActivatedRouteSnapshot) => {
    const store = inject(Store);
    store.dispatch(CPActions.setCurrentPartnerId({ currentPartnerId: route.params.partnerId }));
    return store.select(CPSelectors.selectHasStoreLoaded).pipe(
        switchMap(loaded => {
            if (loaded) {
                return of(true);
            }

            store.dispatch(CPActions.loadChannelPartnersAndOrgs({ includeChildOrgs: false }));
            return store.select(CPSelectors.selectHasStoreLoaded);
        }),
        filter(Boolean),
    );
};

const CPRoutes: Routes = withTabReporterResolver([
    {
        path: ':partnerId',
        component: NxChannelPartnersComponent,
        resolve: {
            parentData: WithParentDataResolver,
        },
        canActivate: [setPartnerId],
        canDeactivate: [updateParentPartnerId],
        runGuardsAndResolvers: 'always',
        children: [
            {
                path: '',
                component: NxChannelPartnersComponent,
                canActivate: [ChannelPartnerGuard],
            },
            {
                path: 'organization',
                loadChildren: () =>
                    import('@pages/home/organizations/organization.module').then(
                        m => m.NxOrganizationModule,
                    ),
            },
            {
                path: 'settings',
                canActivate: [cpTabGuard],
                component: NxChannelPartnersSettingsComponent,
            },
            {
                path: 'subchannels',
                component: NxSubchannelsComponent,
                canActivate: [cpTabGuard],
            },
            {
                path: 'information',
                canActivate: [cpTabGuard],
                component: NxChannelPartnerInformationComponent,
                canDeactivate: [
                    (component: NxChannelPartnerInformationComponent) => !component.busy$$(),
                ],
            },
            {
                path: 'users',
                canActivate: [cpTabGuard],
                component: NxChannelPartnerUsersComponent,
            },
            {
                path: 'reports',
                canActivate: [() => nxConfig.featureFlags.channelPartnersReportsUI, cpTabGuard],
                component: NxReportsComponent,
                data: {
                    mode: Mode.Partner,
                },
            },
            {
                path: 'support',
                canActivate: [() => nxConfig.featureFlags.channelPartnersSupportUI, cpTabGuard],
                component: NxChannelPartnerInformationComponent,
                data: { readOnlyInfo: true },
            },
            { path: '**', redirectTo: '' },
        ],
    },
    {
        path: '**',
        redirectTo: '/home',
    },
]);

@NgModule({
    imports: [RouterModule.forChild(CPRoutes)],
    declarations: [],
    providers: [],
    exports: [],
})
export class NxChannelPartnersModule {}
