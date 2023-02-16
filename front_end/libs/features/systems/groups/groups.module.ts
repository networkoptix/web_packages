import { DragDropModule } from '@angular/cdk/drag-drop';
import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
// import { AngularSvgIconModule } from 'angular-svg-icon';
import { StoreModule } from '@ngrx/store';
import { AngularSvgIconModule } from 'angular-svg-icon';

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
                path: ':groupId',
                component: NxSystemGroupsComponent,
                canActivate: [AuthGuard],
            }
        ]),
        StoreModule.forFeature('groups', groupsReducer),

        NxGroupsSidebarLevelModule,
        NxGroupsCardsModule,
        PreLoaderModule,
        NxSystemGroupsSidebarModule,
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
