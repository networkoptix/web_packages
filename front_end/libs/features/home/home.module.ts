import { DragDropModule } from '@angular/cdk/drag-drop';
import { CdkMenuModule } from '@angular/cdk/menu';
import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
// import { AngularSvgIconModule } from 'angular-svg-icon';
import { StoreModule } from '@ngrx/store';
import { AngularSvgIconModule } from 'angular-svg-icon';

import { accountReducer } from '@common/store/account';
import { CheckboxModule } from '@components/checkbox/checkbox.module';
import { ComponentsCoreModule } from '@components/components-core.module';
import { PreLoaderModule } from '@components/placeholders/pre-loader/pre-loader.module';
import { NxSearchHighlightModule } from '@components/search-highlight/search-highlight.module';
import { NxBaseTableModule } from '@components/table/table.module';
import { NxTabsComponent } from '@components/tabs/tabs.component';
import { NxTabsDirective } from '@components/tabs/tabs.directive';
import { AuthGuard } from '@guards/authGuard';
import { NxUsersTableComponent } from '@pages/home/components/users-table/users-table.component';

import { NxChannelPartnersComponent } from './channel-partners/channel-partners.component';
import { NxGroupCardComponent } from './components/group-card/group-card.component';
import { NxGroupsCardsComponent } from './components/groups-cards/groups-cards.component';
import { NxChannelPartnerInformationComponent } from './components/information/information.component';
import { NxOrganizationReportsComponent } from './components/reports/reports.component';
import { NxOrganizationSettingsComponent } from './components/settings/settings.component';
import { NxGroupsSidebarLevelComponent } from './components/sidebar-level/sidebar-level.component';
import { NxSystemGroupsSidebarComponent } from './components/sidebar/sidebar.component';
import { NxSystemCardComponent } from './components/system-card/system-card.component';
import { NxOrganizationUsersComponent } from './components/users/users.component';
import { NxOrganizationsComponent } from './organizations/organization.component';
import { groupsReducer } from './store/groups.reducer';
import { NxGroupsSystemsComponent } from './systems/systems.component';
import { TabResolver } from './tab-resolver';

const homeRoutes: Routes = [
    {
        path: '',
        redirectTo: 'personal',
        pathMatch: 'full'
    },
    {
        path: 'personal',
        component: NxGroupsSystemsComponent,
        canActivate: [AuthGuard],
    },
    {
        path: 'shared',
        component: NxGroupsSystemsComponent,
        canActivate: [AuthGuard],
    },
    {
        path: 'organization',
        loadChildren: () => import('@pages/home/organizations/organization.module').then(m => m.NxOrganizationModule),
        canActivate: [AuthGuard],
    },
    // {
    //     path: 'channelPartners',
    //     loadChildren: () => import('@pages/home/channel-partners/channel-partners.module').then(m => m.NxChannelPartnersModule),
    //     canActivate: [AuthGuard],
    // },
];

@NgModule({
    imports: [
        AngularSvgIconModule.forRoot(),
        ComponentsCoreModule,
        DragDropModule,
        PreLoaderModule,
        NxSearchHighlightModule,
        CdkMenuModule,
        StoreModule.forFeature('groups', groupsReducer),
        StoreModule.forFeature('account', accountReducer),
        RouterModule.forChild(homeRoutes),
        CheckboxModule,
        NxBaseTableModule
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
        NxGroupsSystemsComponent,
        NxUsersTableComponent,
        NxChannelPartnersComponent,
        NxChannelPartnerInformationComponent
    ],
    providers: [
        TabResolver,
    ],
    exports: [],
})
export class NxHomeModule {}
