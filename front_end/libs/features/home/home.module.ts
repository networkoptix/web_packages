import { DragDropModule } from '@angular/cdk/drag-drop';
import { CdkMenuModule } from '@angular/cdk/menu';
import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
// import { AngularSvgIconModule } from 'angular-svg-icon';
import { StoreModule } from '@ngrx/store';
import { AngularSvgIconModule } from 'angular-svg-icon';

import { accountReducer } from '@common/store/account';
import { ComponentsCoreModule } from '@components/components-core.module';
import { PreLoaderModule } from '@components/placeholders/pre-loader/pre-loader.module';
import { NxSearchHighlightModule } from '@components/search-highlight/search-highlight.module';
import { NxTabsComponent } from '@components/tabs/tabs.component';
import { AuthGuard } from '@guards/authGuard';

import { NxGroupCardComponent } from './components/group-card/group-card.component';
import { NxGroupsCardsComponent } from './components/groups-cards/groups-cards.component';
import { NxOrganizationReportsComponent } from './components/reports/reports.component';
import { NxOrganizationSettingsComponent } from './components/settings/settings.component';
import { NxGroupsSidebarLevelComponent } from './components/sidebar-level/sidebar-level.component';
import { NxSystemGroupsSidebarComponent } from './components/sidebar/sidebar.component';
import { NxSystemCardComponent } from './components/system-card/system-card.component';
import { NxOrganizationUsersComponent } from './components/users/users.component';
import { NxOrganizationsComponent } from './organizations/organization.component';
import { groupsReducer } from './store/groups.reducer';
import { NxGroupsSystemsComponent } from './systems/systems.component';

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
        path: 'organization/:id',
        component: NxOrganizationsComponent,
        canActivate: [AuthGuard],
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
            }
        ],
    },
    {
        path: 'organization',
        component: NxOrganizationsComponent,
        canActivate: [AuthGuard],
    },
    {
        path: '**',
        redirectTo: '',
    },
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
    ],
    declarations: [
        NxOrganizationsComponent,
        NxGroupCardComponent,
        NxGroupsCardsComponent,
        NxGroupsSystemsComponent,
        NxTabsComponent,
        NxGroupsSidebarLevelComponent,
        NxSystemGroupsSidebarComponent,
        NxSystemCardComponent,
    ],
    providers: [],
    exports: [],
})
export class NxHomeModule {}
