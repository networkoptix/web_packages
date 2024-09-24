import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { StoreModule } from '@ngrx/store';

import { accountReducer } from '@common/store/account';
import { AuthGuard } from '@guards/authGuard';
import { Nx404Component } from '@pages/404/404.component';
import { SystemsDisplayMode } from '@pages/home/home.types';

import { NxHomeComponent } from './home.component';
import { HistoryGuard } from './resolvers/cp-history-guard';
import { FindGroupGuard } from './resolvers/find-group-guard';

const homeRoutes: Routes = [
    {
        path: 'redirect-to-group/:systemId',
        canActivate: [FindGroupGuard],
        component: Nx404Component,
    },
    {
        path: '',
        component: NxHomeComponent,
        canActivate: [AuthGuard, HistoryGuard],
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
                path: 'channel-partners',
                loadChildren: () =>
                    import('@pages/home/channel-partners/channel-partners.module').then(
                        m => m.NxChannelPartnersModule,
                    ),
            },
            {
                path: 'subchannel',
                loadChildren: () =>
                    import('@pages/home/sub-channels/sub-channel.module').then(
                        m => m.NxSubChannelPartnersModule,
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
        StoreModule.forFeature('account', accountReducer),
    ],
})
export class NxHomeModule {}
