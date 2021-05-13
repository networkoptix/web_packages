import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import TimelinePageComponent from './pages/timeline/timeline-page.component';

import SystemPageComponent from './pages/system/system-page.component';
import CameraPageComponent from './pages/system/camera/camera-page.component';

export const routes: Routes = [

    { path: 'timeline', component: TimelinePageComponent },

    {
        path      : 'web-client',
        component : SystemPageComponent,
        children  : [
            {
                path      : ':camera-id',
                component : CameraPageComponent
            }
        ]
    }

];

@NgModule({
    imports : [RouterModule.forChild(routes)],
    exports : [RouterModule]
})
export class VmsClientRoutingModule {
}

export default VmsClientRoutingModule;
