import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { nxConfig } from '@services/nx-config/config';

import { NxGroupsCardsComponent } from '../components/groups-cards/groups-cards.component';
import { NxOrganizationReportsComponent } from '../components/reports/reports.component';
import { NxOrganizationSettingsComponent } from '../components/settings/settings.component';
import { NxOrganizationUsersComponent } from '../components/users/org-users/org-users.component';
import { CPResovler } from '../resolvers/CP-resolver';
import { WithParentDataResolver } from '../resolvers/data-resolver';
import { RoleResolver } from '../resolvers/role-resolver';
import { SystemGroupsConnectedResolver } from '../resolvers/system-groups-connected-resolver';
import { TabGuard } from '../resolvers/tab-guard';
import { TabResolver } from '../resolvers/tab-resolver';

import { NxOrganizationsComponent } from './organization.component';

const orgRoutes: Routes = [
    {
        path: ':organizationId',
        component: NxOrganizationsComponent,
        resolve: {
            currentTabRoute: TabResolver,
            parentData: WithParentDataResolver,
            isAdmin: RoleResolver,
            inChannelPartner: CPResovler,
            groupsServiceConnected: SystemGroupsConnectedResolver,
        },
        runGuardsAndResolvers: 'always',
        children: [
            {
                path: 'systems',
                component: NxGroupsCardsComponent,
            },
            {
                path: 'reports',
                canActivate: [() => nxConfig.featureFlags.channelPartnersReports, TabGuard],
                component: NxOrganizationReportsComponent,
            },
            {
                path: 'users',
                canActivate: [TabGuard],
                component: NxOrganizationUsersComponent,
            },
            {
                path: 'settings',
                canActivate: [TabGuard],
                data: {
                    orgSettings: true,
                },
                component: NxOrganizationSettingsComponent,
            },
            {
                path: 'group/:groupId',
                component: NxGroupsCardsComponent,
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
