import { Routes } from '@angular/router';

import { AuthGuard } from '@guards/authGuard';
import { TwofaGuard } from '@guards/twofaGuard';

import { NxSystemViewCameraPageComponent } from './pages/system-view-camera/system-view-camera.page.component';
import { NxSystemViewIndexPageComponent } from './pages/system-view-index/system-view-index.page.component';

export const routes: Routes = [
    {
        path: '',
        component: NxSystemViewIndexPageComponent,
        canActivate: [AuthGuard, TwofaGuard],
        children: [
            {
                path: ':cameraId',
                component: NxSystemViewCameraPageComponent,
                // canActivate: [AuthGuard]
            }
        ]
    }
];
