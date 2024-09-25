import { inject, NgModule } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivateFn, RouterModule, Routes } from '@angular/router';
import { Store } from '@ngrx/store';

import * as CPActions from '@common/store/channel-partners/channel-partners.actions';
import { nxApplyV3Guard } from '@components/forms/apply-v3/apply-v3.guard';
import { nxConfig } from '@services/nx-config/config';

import { NxSupportComponent } from '../components/information/support/support.component';
import { NxReportsComponent } from '../components/reports/reports.component';
import { Mode } from '../components/reports/reports.types';
import { NxOrganizationSettingsComponent } from '../components/settings/organization-settings/organization-settings.component';
import { NxOrganizationUsersComponent } from '../components/users/org-users/org-users.component';
import { orgTabGuard } from '../resolvers/org-tab-guard';

import { NxOrganizationCardContainerComponent } from './cards-container/org-cards-container.component';
import { NxOrganizationsComponent } from './organization.component';

const setOrgId: CanActivateFn = (route: ActivatedRouteSnapshot) => {
    inject(Store).dispatch(
        CPActions.setCurrentOrgId({ currentOrgId: route.params.organizationId }),
    );
    return true;
};

const orgRoutes: Routes = [
    {
        path: ':organizationId',
        component: NxOrganizationsComponent,
        canActivate: [setOrgId],
        children: [
            {
                path: 'systems',
                component: NxOrganizationCardContainerComponent,
                data: { inRoot: true },
            },
            {
                path: 'reports',
                canActivate: [() => nxConfig.featureFlags.channelPartnersReportsUI, orgTabGuard],
                component: NxReportsComponent,
                data: {
                    mode: Mode.Organization,
                },
            },
            {
                path: 'users',
                canActivate: [orgTabGuard],
                component: NxOrganizationUsersComponent,
            },
            {
                path: 'users/:email',
                canActivate: [orgTabGuard],
                component: NxOrganizationsComponent,
            },
            {
                path: 'settings',
                canActivate: [orgTabGuard],
                canDeactivate: [nxApplyV3Guard],
                component: NxOrganizationSettingsComponent,
            },
            {
                path: 'support',
                canActivate: [() => nxConfig.featureFlags.channelPartnersSupportUI, orgTabGuard],
                component: NxSupportComponent,
            },
            {
                path: 'group/:groupId',
                redirectTo: 'group/:groupId/systems',
                data: { inRoot: false },
            },
            {
                path: 'group/:groupId/systems',
                component: NxOrganizationCardContainerComponent,
                data: { inRoot: false },
            },
            {
                path: 'group/:groupId/users',
                component: NxOrganizationUsersComponent,
                canActivate: [orgTabGuard],
                data: { inGroup: true },
            },
            {
                path: 'group/:groupId/users/:email',
                component: NxOrganizationsComponent,
                canActivate: [orgTabGuard],
            },
            {
                path: '**',
                redirectTo: 'systems',
            },
        ],
    },
    {
        path: '**',
        redirectTo: '/home',
    },
];

@NgModule({
    imports: [RouterModule.forChild(orgRoutes)],
    declarations: [],
    providers: [],
    exports: [],
})
export class NxOrganizationModule {}
