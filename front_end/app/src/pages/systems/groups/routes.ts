import { Routes } from '@angular/router';

import { AuthGuard } from '@guards/authGuard';

import { NxSystemGroupPageComponent } from './pages/system-group/system-group-page.component';
import { NxSystemGroupsIndexPageComponent } from './pages/system-groups-index/system-groups-index-page.component';

export const routes: Routes = [
    {
        path: '',
        component: NxSystemGroupsIndexPageComponent,
        canActivate: [AuthGuard],
        children: [
            {
                path: ':groupId',
                component: NxSystemGroupPageComponent,
            }
        ]
    },

];
