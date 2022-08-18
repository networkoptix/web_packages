import { Routes } from '@angular/router';

import { AuthGuard } from '@guards/authGuard';

import { NxSystemGroupPageComponent } from './pages/system-group/system-group-page.component';
import { NxSystemGroupsIndexPageComponent } from './pages/system-groups-index/system-groups-index-page.component';
import { NxSystemGroupsPageComponent } from './pages/system-groups/system-groups-page.component';

export const routes: Routes = [
    {
        path: '',
        component: NxSystemGroupsPageComponent,
        canActivate: [AuthGuard],
        children: [
            {
                path: '',
                component: NxSystemGroupsIndexPageComponent,
            },
            {
                path: ':groupId',
                component: NxSystemGroupPageComponent,
            }
        ]
    },

];
