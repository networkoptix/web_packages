import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { NxChannelPartnerInformationComponent } from '../components/information/information.component';
import { NxOrganizationSettingsComponent } from '../components/settings/settings.component';
import { NxChannelPartnerSubchannelComponent } from '../components/subchannel/subchannel.component';
import { NxOrganizationUsersComponent } from '../components/users/users.component';
import { OrgResolver } from '../org-resolver';
import { TabResolver } from '../tab-resolver';

import { NxChannelPartnersComponent } from './channel-partners.component';

const CPRoutes: Routes = [
    {
        path: ':id',
        component: NxChannelPartnersComponent,
        resolve: { currentTab: TabResolver, inOrganization: OrgResolver },
        runGuardsAndResolvers: 'always',
        children: [
            {
                path: '',
                component: NxChannelPartnersComponent,
            },
            {
                path: 'settings',
                component: NxOrganizationSettingsComponent,
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
                component: NxOrganizationSettingsComponent,
            },
            {
                path: 'subchannel',
                component: NxChannelPartnerSubchannelComponent,
            },
            {
                path: 'information',
                component: NxChannelPartnerInformationComponent,
            },
            {
                path: 'users',
                component: NxOrganizationUsersComponent,
            },
        ],
    },
    {
        path: '**',
        redirectTo: '/home',
    },
];

@NgModule({
    imports: [RouterModule.forChild(CPRoutes)],
    declarations: [],
    providers: [],
    exports: [],
})
export class NxChannelPartnersModule {}
