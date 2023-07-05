import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { nxConfig } from '@services/nx-config/config';

import { CPResovler } from '../CP-resolver';
import { NxGroupsCardsComponent } from '../components/groups-cards/groups-cards.component';
import { NxOrganizationReportsComponent } from '../components/reports/reports.component';
import { NxOrganizationSettingsComponent } from '../components/settings/settings.component';
import { NxOrganizationUsersComponent } from '../components/users/org-users/org-users.component';
import { WithParentDataResolver } from '../resolvers/data-resolver';
import { TabResolver } from '../resolvers/tab-resolver';
import { RoleResolver } from '../role-resolver';
import { TabGuard } from '../tab-guard';

import { NxOrganizationsComponent } from './organization.component';

const orgRoutes: Routes = [
    {
        path: ':id',
        component: NxOrganizationsComponent,
        resolve: {
            currentTab: TabResolver,
            parentData: WithParentDataResolver,
            isAdmin: RoleResolver,
            inChannelPartner: CPResovler,
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
