import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule } from '@ngx-translate/core';
import { ComponentsModule } from '../../../components/components.module';
import NxSystemViewIndexPageComponent from './pages/system-view-index/system-view-index.page.component';
import NxSystemViewCameraPageComponent from './pages/system-view-camera/system-view-camera.page.component';
import { CookieService } from 'ngx-cookie-service';

import CameraQualityStorageService from './services/cameraQualityStorage.service';
import CameraTransportStorageService from './services/cameraTransportStorage.service';

import routes from './routes';

import VmsClientModule from './vms-client/vms-client.module';
import VmsClientPlaybackModule from './vms-client/submodules/playback/playback.module';
import VmsClientTimelineModule from './vms-client/submodules/timeline/timeline.module';
import VmsClientVmsModule from './vms-client/submodules/vms/vms.module';

@NgModule({
    imports: [
        CommonModule,
        RouterModule,
        NgbModule,
        TranslateModule,
        ComponentsModule,

        VmsClientPlaybackModule,
        VmsClientTimelineModule,
        VmsClientVmsModule,
        VmsClientModule,
        RouterModule.forChild(routes)
    ],
    providers: [
        CookieService,
        CameraQualityStorageService,
        CameraTransportStorageService
    ],
    declarations: [
        NxSystemViewIndexPageComponent,
        NxSystemViewCameraPageComponent
    ],
    bootstrap : [],
    exports   : [
        NxSystemViewIndexPageComponent
    ]
})
export class NxSystemViewModule {
}
