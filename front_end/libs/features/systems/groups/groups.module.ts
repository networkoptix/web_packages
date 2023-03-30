import { DragDropModule } from '@angular/cdk/drag-drop';
import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
// import { AngularSvgIconModule } from 'angular-svg-icon';
import { StoreModule } from '@ngrx/store';
import { AngularSvgIconModule } from 'angular-svg-icon';

import { accountReducer } from '@common/store/account';
import { ComponentsCoreModule } from '@components/components-core.module';
import { PreLoaderModule } from '@components/placeholders/pre-loader/pre-loader.module';
import { AuthGuard } from '@guards/authGuard';

import {
    NxGroupsCardsModule
} from './components/groups-cards/groups-cards.module';
import {
    NxGroupsSidebarLevelModule
} from './components/sidebar-level/sidebar-level.module';
import { NxSystemGroupsSidebarModule } from './components/sidebar/sidebar.module';
import { NxGroupsSystemsComponent } from './components/systems/systems.component';
import { NxGroupsSystemsModule } from './components/systems/systems.module';
import { NxSystemGroupsComponent } from './groups.component';
import { groupsReducer } from './store/groups.reducer';

@NgModule({
    imports: [
        AngularSvgIconModule.forRoot(),
        ComponentsCoreModule,
        DragDropModule,
        RouterModule.forChild([
            {
                path: '',
                component: NxSystemGroupsComponent,
                canActivate: [AuthGuard],
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
                component: NxSystemGroupsComponent,
                canActivate: [AuthGuard],
            },
            {
                path: '**',
                redirectTo: 'personal',
            }
        ]),
        StoreModule.forFeature('groups', groupsReducer),
        StoreModule.forFeature('account', accountReducer),
        NxGroupsSidebarLevelModule,
        NxGroupsCardsModule,
        PreLoaderModule,
        NxSystemGroupsSidebarModule,
        NxGroupsSystemsModule
    ],
    declarations: [
        NxSystemGroupsComponent,
    ],
    providers: [
        NxSystemGroupsComponent,
    ],
    exports: [
        NxSystemGroupsComponent,
    ]
})
export class NxSystemGroupsModule {}
