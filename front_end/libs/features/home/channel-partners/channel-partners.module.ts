import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { NxChannelPartnerInformationComponent } from '../components/information/information.component';
import { NxOrganizationSettingsComponent } from '../components/settings/settings.component';
import { NxSubchannelComponent } from '../components/subchannel/subchannel.component';
import { NxSubchannelsComponent } from '../components/subchannels/subchannels.component';
import { NxChannelPartnerUsersComponent } from '../components/users/channel-partner-users/channel-partner-users.component';
import { WithParentDataResolver } from '../resolvers/data-resolver';
import { RoleResolver } from '../resolvers/role-resolver';
import { TabGuard } from '../resolvers/tab-guard';
import { TabResolver } from '../resolvers/tab-resolver';

import { NxChannelPartnersComponent } from './channel-partners.component';

const CPRoutes: Routes = [
    {
        path: ':id',
        component: NxChannelPartnersComponent,
        resolve: {
            currentTabRoute: TabResolver,
            parentData: WithParentDataResolver,
            isAdmin: RoleResolver,
        },
        runGuardsAndResolvers: 'always',
        children: [
            {
                path: '',
                component: NxChannelPartnersComponent,
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
                canActivate: [TabGuard],
                component: NxOrganizationSettingsComponent,
            },
            {
                path: 'subchannels',
                component: NxSubchannelsComponent,
                children: [
                    {
                        path: ':subchannelId',
                        resolve: { currentTabRoute: TabResolver },
                        component: NxSubchannelComponent,
                        children: [
                            {
                                path: '',
                                component: NxChannelPartnerInformationComponent,
                            },
                            {
                                path: 'settings',
                                component: NxOrganizationSettingsComponent,
                            },
                        ],
                    },
                ],
            },
            {
                path: 'information',
                component: NxChannelPartnerInformationComponent,
            },
            {
                path: 'users',
                canActivate: [TabGuard],
                component: NxChannelPartnerUsersComponent,
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
