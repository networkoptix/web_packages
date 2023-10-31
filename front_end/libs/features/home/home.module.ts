import { DragDropModule } from '@angular/cdk/drag-drop';
import { CdkMenuModule } from '@angular/cdk/menu';
import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule, Routes } from '@angular/router';
import { StoreModule } from '@ngrx/store';
import { TranslateModule } from '@ngx-translate/core';
import { AngularSvgIconModule } from 'angular-svg-icon';

import { accountReducer } from '@common/store/account';
import { NxCheckboxComponent } from '@components/checkbox/checkbox.component';
import { NxPreLoaderComponent } from '@components/placeholders/pre-loader/pre-loader.component';
import { NxSearchComponent } from '@components/search/search.component';
import { NxSearchHighlightComponent } from '@components/search-highlight/search-highlight.component';
import { NxBaseTableComponent } from '@components/table/table.component';
import { NxTabsComponent } from '@components/tabs/tabs.component';
import { AuthGuard } from '@guards/authGuard';
import { SystemsDisplayMode } from '@pages/home/home.types';

import { NxChannelPartnersComponent } from './channel-partners/channel-partners.component';
import { NxSystemGroupsSidebarComponent } from './components/sidebar/sidebar.component';
import { NxSystemCardComponent } from './components/system-card/system-card.component';
import { NxHomeComponent } from './home.component';
import { NxOrganizationsComponent } from './organizations/organization.component';
import { OrgResolver } from './resolvers/org-resolver';
import { SubChannelResolver } from './resolvers/subchannel-resolver';
import { channelPartnersReducer } from './store/channel-partners/channel-partners.reducer';
import { groupsReducer } from './store/groups/groups.reducer';
import { NxSystemsComponent } from './systems/systems.component';

const homeRoutes: Routes = [
    {
        path: '',
        resolve: { inOrganization: OrgResolver, inSubchannel: SubChannelResolver },
        runGuardsAndResolvers: 'always',
        component: NxHomeComponent,
        canActivate: [AuthGuard],
        children: [
            {
                path: '',
                component: NxPreLoaderComponent,
            },
            {
                path: 'personal',
                data: {
                    displayMode: SystemsDisplayMode.Personal,
                },
                component: NxSystemsComponent,
            },
            {
                path: 'shared',
                data: {
                    displayMode: SystemsDisplayMode.Shared,
                },
                component: NxSystemsComponent,
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
        TranslateModule,
        AngularSvgIconModule,
        CdkMenuModule,
        DragDropModule,
        StoreModule.forFeature('groups', groupsReducer),
        StoreModule.forFeature('account', accountReducer),
        StoreModule.forFeature('channelPartners', channelPartnersReducer),
        NxCheckboxComponent,
        NxBaseTableComponent,
        NxSearchHighlightComponent,
        NxPreLoaderComponent,
        NxTabsComponent,
        NxSystemGroupsSidebarComponent,
        NxSystemCardComponent,
        NxSearchComponent,
        FormsModule,
        NxChannelPartnersComponent,
        NxOrganizationsComponent,
    ],
})
export class NxHomeModule {}
