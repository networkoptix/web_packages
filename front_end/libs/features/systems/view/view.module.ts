import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { AngularSvgIconModule } from 'angular-svg-icon';
import { CookieService } from 'ngx-cookie-service';

import { PipesModule } from '@app/pipes/pipes.module';
import { ComponentsModule } from '@components/components.module';
import { PagePlaceHolderModule } from '@components/placeholders/page/page-placeholder.module';
import { PlayerPlaceholderModule } from '@components/placeholders/player/player-placeholder.module';
import { DirectivesModule } from '@directives/directives.module';

import { NxCameraDetailsComponent } from './components/camera-details/camera-details.component';
import { NxSystemViewCameraPageComponent } from './pages/system-view-camera/system-view-camera.page.component';
import { NxSystemViewIndexPageComponent } from './pages/system-view-index/system-view-index.page.component';
import { routes } from './routes';
import { CameraQualityStorageService } from './services/cameraQualityStorage.service';
import { CameraTransportStorageService } from './services/cameraTransportStorage.service';
import { VmsClientPlaybackModule } from './vms-client/submodules/playback/playback.module';
import { VmsClientTimelineModule } from './vms-client/submodules/timeline/timeline.module';
import { VmsClientVmsModule } from './vms-client/submodules/vms/vms.module';
import { VmsClientModule } from './vms-client/vms-client.module';

@NgModule({
    imports: [
        CommonModule,
        RouterModule,
        TranslateModule,
        ComponentsModule,
        DirectivesModule,
        PipesModule,
        AngularSvgIconModule.forRoot(),

        VmsClientPlaybackModule,
        VmsClientTimelineModule,
        VmsClientVmsModule,
        VmsClientModule,
        RouterModule.forChild(routes),
        PagePlaceHolderModule,
        PlayerPlaceholderModule
    ],
    providers: [
        CookieService,
        CameraQualityStorageService,
        CameraTransportStorageService
    ],
    declarations: [
        NxSystemViewIndexPageComponent,
        NxSystemViewCameraPageComponent,
        NxCameraDetailsComponent,
    ],
    bootstrap: [],
    exports: [
        NxSystemViewIndexPageComponent
    ]
})
export class NxSystemViewModule {
}
