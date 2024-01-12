import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { NxChannelPartnerInformationComponent } from '../components/information/information.component';
import { NxOrganizationSettingsComponent } from '../components/settings/settings.component';
import { NxSubchannelComponent } from '../components/subchannel/subchannel.component';
import { NxSubchannelsComponent } from '../components/subchannels/subchannels.component';
import { NxChannelPartnerUsersComponent } from '../components/users/channel-partner-users/channel-partner-users.component';
import { cpTabGuard } from '../resolvers/CP-tab-guard';
import { WithParentDataResolver } from '../resolvers/data-resolver';
import { TabResolver } from '../resolvers/tab-resolver';

import { NxChannelPartnersComponent } from './channel-partners.component';

const CPRoutes: Routes = [
    {
        path: ':partnerId',
        component: NxChannelPartnersComponent,
        resolve: {
            currentTabRoute: TabResolver,
            parentData: WithParentDataResolver,
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
                canActivate: [cpTabGuard],
                data: {
                    cpSettings: true,
                },
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
                                canActivate: [cpTabGuard],
                                data: {
                                    subchannelSettings: true,
                                },
                                component: NxOrganizationSettingsComponent,
                            },
                            {
                                path: 'users',
                                canActivate: [cpTabGuard],
                                component: NxChannelPartnerUsersComponent,
                            },
                        ],
                    },
                ],
            },
            {
                path: 'information',
                canActivate: [cpTabGuard],
                component: NxChannelPartnerInformationComponent,
            },
            {
                path: 'users',
                canActivate: [cpTabGuard],
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
