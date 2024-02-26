import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { StoreModule } from '@ngrx/store';

import { accountReducer } from '@common/store/account';
import { AuthGuard } from '@guards/authGuard';
import { SystemsDisplayMode } from '@pages/home/home.types';

import { NxHomeComponent } from './home.component';
import { OrgResolver } from './resolvers/org-resolver';
import { SubChannelResolver } from './resolvers/subchannel-resolver';
import { groupsReducer } from './store/groups/groups.reducer';

const homeRoutes: Routes = [
    {
        path: '',
        resolve: {
            inOrganization: OrgResolver,
            inSubchannel: SubChannelResolver,
        },
        runGuardsAndResolvers: 'always',
        component: NxHomeComponent,
        canActivate: [AuthGuard],
        children: [
            {
                path: '',
                loadComponent: () =>
                    import('@components/placeholders/pre-loader/pre-loader.component').then(
                        c => c.NxPreLoaderComponent,
                    ),
            },
            {
                path: 'personal',
                loadComponent: () =>
                    import('@pages/home/systems/systems.component').then(c => c.NxSystemsComponent),
                data: {
                    displayMode: SystemsDisplayMode.Personal,
                },
            },
            {
                path: 'shared',
                loadComponent: () =>
                    import('@pages/home/systems/systems.component').then(c => c.NxSystemsComponent),
                data: {
                    displayMode: SystemsDisplayMode.Shared,
                },
            },
            {
                path: 'organization',
                loadChildren: () =>
                    import('@pages/home/organizations/organization.module').then(
                        m => m.NxOrganizationModule,
                    ),
            },
            {
                path: 'channelPartners',
                loadChildren: () =>
                    import('@pages/home/channel-partners/channel-partners.module').then(
                        m => m.NxChannelPartnersModule,
                    ),
            },
        ],
    },
];

@NgModule({
    imports: [
        NxHomeComponent,
        CommonModule,
        RouterModule.forChild(homeRoutes),
        StoreModule.forFeature('groups', groupsReducer),
        StoreModule.forFeature('account', accountReducer),
    ],
})
export class NxHomeModule {}
