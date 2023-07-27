import { DragDropModule } from '@angular/cdk/drag-drop';
import { CdkMenuModule } from '@angular/cdk/menu';
import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { StoreModule } from '@ngrx/store';
import { TranslateModule } from '@ngx-translate/core';
import { AngularSvgIconModule } from 'angular-svg-icon';

import { accountReducer } from '@common/store/account';
import { NxCheckboxComponent } from '@components/checkbox/checkbox.component';
import { NxPreLoaderComponent } from '@components/placeholders/pre-loader/pre-loader.component';
import { NxSearchHighlightComponent } from '@components/search-highlight/search-highlight.component';
import { NxBaseTableComponent } from '@components/table/table.component';
import { NxTabsComponent } from '@components/tabs/tabs.component';
import { NxTabsDirective } from '@components/tabs/tabs.directive';
import { DirectivesModule } from '@directives/directives.module';
import { AuthGuard } from '@guards/authGuard';
import { NxUsersTableComponent } from '@pages/home/components/users-table/users-table.component';

import { NxChannelPartnersComponent } from './channel-partners/channel-partners.component';
import { NxGroupCardComponent } from './components/group-card/group-card.component';
import { NxGroupsCardsComponent } from './components/groups-cards/groups-cards.component';
import { NxChannelPartnerInformationComponent } from './components/information/information.component';
import { NxOrganizationReportsComponent } from './components/reports/reports.component';
import { NxOrganizationSettingsComponent } from './components/settings/settings.component';
import { NxSystemGroupsSidebarComponent } from './components/sidebar/sidebar.component';
import { NxGroupsSidebarLevelComponent } from './components/sidebar-level/sidebar-level.component';
import { NxSubchannelComponent } from './components/subchannel/subchannel.component';
import { NxSubchannelsComponent } from './components/subchannels/subchannels.component';
import { NxSystemCardComponent } from './components/system-card/system-card.component';
import { NxChannelPartnerUsersComponent } from './components/users/channel-partner-users/channel-partner-users.component';
import { NxOrganizationUsersComponent } from './components/users/org-users/org-users.component';
import { NxHomeComponent } from './home.component';
import { NxOrganizationsComponent } from './organizations/organization.component';
import { CPResovler } from './resolvers/CP-resolver';
import { WithParentDataResolver } from './resolvers/data-resolver';
import { OrgResolver } from './resolvers/org-resolver';
import { RoleResolver } from './resolvers/role-resolver';
import { SubChannelResolver } from './resolvers/subchannel-resolver';
import { TabGuard } from './resolvers/tab-guard';
import { TabResolver } from './resolvers/tab-resolver';
import { channelPartnersReducer } from './store/channel-partners/channel-partners.reducer';
import { groupsReducer } from './store/groups/groups.reducer';
import { NxGroupsSystemsComponent } from './systems/systems.component';

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
                component: NxGroupsSystemsComponent,
            },
            {
                path: 'shared',
                component: NxGroupsSystemsComponent,
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
        DirectivesModule,
        NxBaseTableComponent,
        NxSearchHighlightComponent,
        NxPreLoaderComponent,
    ],
    declarations: [
        NxOrganizationsComponent,
        NxGroupCardComponent,
        NxGroupsCardsComponent,
        NxGroupsSystemsComponent,
        NxTabsComponent,
        NxTabsDirective,
        NxGroupsSidebarLevelComponent,
        NxSystemGroupsSidebarComponent,
        NxSystemCardComponent,
        NxOrganizationReportsComponent,
        NxOrganizationSettingsComponent,
        NxOrganizationUsersComponent,
        NxChannelPartnerUsersComponent,
        NxGroupsSystemsComponent,
        NxUsersTableComponent,
        NxChannelPartnersComponent,
        NxChannelPartnerInformationComponent,
        NxSubchannelsComponent,
        NxSubchannelComponent,
        NxHomeComponent,
    ],
    providers: [
        TabResolver,
        OrgResolver,
        SubChannelResolver,
        WithParentDataResolver,
        TabGuard,
        RoleResolver,
        CPResovler,
    ],
    exports: [],
})
export class NxHomeModule {}
