import { inject, NgModule } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivateFn, RouterModule, Routes } from '@angular/router';
import { Store } from '@ngrx/store';

import * as CPActions from '@store/channel-partners/channel-partners.actions';

import { NxChannelPartnerInformationComponent } from '../components/information/information.component';
import { NxChannelPartnersSettingsComponent } from '../components/settings-v2/channel-partners-settings/channel-partners-settings.component';
import { NxSubchannelComponent } from '../components/subchannel/subchannel.component';
import { NxSubchannelsComponent } from '../components/subchannels/subchannels.component';
import { NxChannelPartnerUsersComponent } from '../components/users/channel-partner-users/channel-partner-users.component';
import { cpTabGuard } from '../resolvers/CP-tab-guard';
import { ChannelPartnerGuard } from '../resolvers/channel-partner-guard';
import { WithParentDataResolver } from '../resolvers/data-resolver';
import { withTabReporterResolver } from '../resolvers/tab-id-reporter-resolver';

import { NxChannelPartnersComponent } from './channel-partners.component';

const setPartnerId: CanActivateFn = (route: ActivatedRouteSnapshot) => {
    inject(Store).dispatch(
        CPActions.setCurrentPartnerId({ currentPartnerId: route.params.partnerId }),
    );
    return true;
};

const CPRoutes: Routes = withTabReporterResolver([
    {
        path: ':partnerId',
        component: NxChannelPartnersComponent,
        resolve: {
            parentData: WithParentDataResolver,
        },
        canActivate: [setPartnerId],
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
                children: [
                    {
                        path: ':subchannelId',
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
                                component: NxChannelPartnersSettingsComponent,
                            },
                            {
                                path: 'users',
                                data: {
                                    inSubchannel: true,
                                },
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
]);

@NgModule({
    imports: [RouterModule.forChild(CPRoutes)],
    declarations: [],
    providers: [],
    exports: [],
})
export class NxChannelPartnersModule {}
