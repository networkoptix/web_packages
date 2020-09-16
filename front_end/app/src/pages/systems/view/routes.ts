import { Routes } from '@angular/router'
import { AuthGuard } from '../../../routeGuards/authGuard'
import NxSystemViewIndexPageComponent from './pages/system-view-index/system-view-index.page.component'
import NxSystemViewCameraPageComponent from './pages/system-view-camera/system-view-camera.page.component'
import { environment } from '../../../../environments/environment'

export const routes: Routes = [
    {
        path        : environment.isLocal ? 'view' : 'systems/:systemId/view',
        component   : NxSystemViewIndexPageComponent,
        canActivate : [AuthGuard],
        children    : [
            {
                path        : ':cameraId',
                component   : NxSystemViewCameraPageComponent,
                canActivate : [AuthGuard]
            }
        ]
    }
]

export default routes
