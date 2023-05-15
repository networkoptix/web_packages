import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { AuthGuard } from '@guards/authGuard';

import { NxGroupsCardsComponent } from '../components/groups-cards/groups-cards.component';
import { NxOrganizationReportsComponent } from '../components/reports/reports.component';
import { NxOrganizationSettingsComponent } from '../components/settings/settings.component';
import { NxOrganizationUsersComponent } from '../components/users/users.component';
import { TabResolver } from '../tab-resolver';

import { NxOrganizationsComponent } from './organization.component';

const orgRoutes: Routes = [
    {
        path: ':id',
        canActivate: [AuthGuard],
        component: NxOrganizationsComponent,
        resolve: { currentTab: TabResolver },
        children: [
            {
                path: 'systems',
                component: NxGroupsCardsComponent,
            },
            {
                path: 'reports',
                component: NxOrganizationReportsComponent,
            },
            {
                path: 'users',
                component: NxOrganizationUsersComponent,
            },
            {
                path: 'settings',
                component: NxOrganizationSettingsComponent
            },
            {
                path: 'group/:groupId',
                component: NxGroupsCardsComponent
            },
            {
                path: '**',
                redirectTo: 'systems'
            }
        ],
    },
    {
        path: '**',
        redirectTo: '/home',
    }
];

@NgModule({
    imports: [
        RouterModule.forChild(orgRoutes)

    ],
    declarations: [
    ],
    providers: [],
    exports: [

    ]
})
export class NxOrganizationModule { }
