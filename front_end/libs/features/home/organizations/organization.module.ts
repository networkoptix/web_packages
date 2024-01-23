import { inject, NgModule } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivateFn, RouterModule, Routes } from '@angular/router';
import { Store } from '@ngrx/store';

import * as CPActions from '@pages/home/store/channel-partners/channel-partners.actions';
import { nxConfig } from '@services/nx-config/config';

import { NxOrganizationReportsComponent } from '../components/reports/reports.component';
import { NxOrganizationSettingsComponent } from '../components/settings/settings.component';
import { NxOrganizationUsersComponent } from '../components/users/org-users/org-users.component';
import { CPResovler } from '../resolvers/CP-resolver';
import { WithParentDataResolver } from '../resolvers/data-resolver';
import { orgTabGuard } from '../resolvers/org-tab-guard';
import { TabResolver } from '../resolvers/tab-resolver';

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
        resolve: {
            currentTabRoute: TabResolver,
            parentData: WithParentDataResolver,
            inChannelPartner: CPResovler,
        },
        canActivate: [setOrgId],
        runGuardsAndResolvers: 'always',
        children: [
            {
                path: 'systems',
                component: NxOrganizationCardContainerComponent,
                data: { inRoot: true },
            },
            {
                path: 'reports',
                canActivate: [() => nxConfig.featureFlags.channelPartnersReports, orgTabGuard],
                component: NxOrganizationReportsComponent,
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
                data: {
                    orgSettings: true,
                },
                component: NxOrganizationSettingsComponent,
            },
            {
                path: 'group/:groupId',
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
