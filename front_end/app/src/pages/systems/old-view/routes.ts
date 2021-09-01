import { Routes }                      from '@angular/router';
import { AuthGuard }                   from '../../../routeGuards';
import { NxOldViewPageComponent }      from './old-view.component';

export const routes: Routes = [
    {
        path        : '',
        component   : NxOldViewPageComponent,
        canActivate : [AuthGuard],
        children    : [
            {
                path        : ':cameraId',
                component   : NxOldViewPageComponent,
                canActivate : [AuthGuard]
            }
        ]
    }
];

export default routes;
