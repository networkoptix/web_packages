import { Routes }                      from '@angular/router';
import { AuthGuard }                   from '../../../routeGuards';
import NxSystemViewIndexPageComponent  from './pages/system-view-index/system-view-index.page.component';
import NxSystemViewCameraPageComponent from './pages/system-view-camera/system-view-camera.page.component';

export const routes: Routes = [
    {
        path: '',
        component: NxSystemViewIndexPageComponent,
        canActivate: [AuthGuard],
        children: [
            {
                path: ':cameraId',
                component: NxSystemViewCameraPageComponent,
                canActivate: [AuthGuard]
            }
        ]
    }
];

export default routes;
