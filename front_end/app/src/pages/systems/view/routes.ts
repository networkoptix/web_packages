import { Routes } from '@angular/router';
import { AuthGuard } from '../../../routeGuards/authGuard';
import NxSystemViewComponent from './views/system-view/system-view.component';
import NxSystemCameraViewComponent from './views/system-camera-view/system-camera-view.component';
import { environment } from '../../../../environments/environment';

export const routes: Routes = [
    {
        path        : environment.isLocal ? 'view' : 'systems/:systemId/view',
        component   : NxSystemViewComponent,
        canActivate : [AuthGuard],
        children    : [
            {
                path        : ':cameraId',
                component   : NxSystemCameraViewComponent,
                canActivate : [AuthGuard]
            }
        ]
    }
];

export default routes;
