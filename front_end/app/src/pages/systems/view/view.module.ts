import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BrowserModule } from '@angular/platform-browser';
import { UpgradeModule } from '@angular/upgrade/static';
import { RouterModule } from '@angular/router';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule } from '@ngx-translate/core';
import { ComponentsModule } from '../../../components/components.module';
import { ApplyGuard } from '../../../routeGuards';
import NxSystemViewIndexPageComponent from './pages/system-view-index/system-view-index.page.component'
import NxSystemViewCameraPageComponent from './pages/system-view-camera/system-view-camera.page.component'
import { CookieService } from 'ngx-cookie-service'

import routes from './routes'
import components from './components'

import VmsClientModule from './vms-client/vms-client.module'
import VmsClientPlaybackModule from './vms-client/submodules/playback/playback.module'
import VmsClientTimelineModule from './vms-client/submodules/timeline/timeline.module'
import VmsClientVmsModule from './vms-client/submodules/vms/vms.module'


import { routes as vmsSandboxRoutes } from './vms-client/vms-client-routing.module'

@NgModule({
    imports: [
        CommonModule,
        BrowserModule,
        UpgradeModule,
        RouterModule,
        NgbModule,
        TranslateModule,
        ComponentsModule,

        VmsClientPlaybackModule,
        VmsClientTimelineModule,
        VmsClientVmsModule,
        VmsClientModule,

        RouterModule.forChild(routes),
        RouterModule.forChild(vmsSandboxRoutes),
    ],
    providers: [
        ApplyGuard,
        CookieService,
    ],
    declarations: [
        NxSystemViewIndexPageComponent,
        NxSystemViewCameraPageComponent,
        components,
    ],
    bootstrap       : [],
    exports: [
        NxSystemViewIndexPageComponent,
    ]
})
export class NxSystemViewModule {
}
