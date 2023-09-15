import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { AngularSvgIconModule } from 'angular-svg-icon';
import { CookieService } from 'ngx-cookie-service';

import { NxClientButtonComponent } from '@components/open-client-button/client-button.component';
import { NxPagePlaceholderComponent } from '@components/placeholders/page/page-placeholder.component';
import { NxPlayerPlaceholderComponent } from '@components/placeholders/player/player-placeholder.component';
import { NxPreLoaderComponent } from '@components/placeholders/pre-loader/pre-loader.component';
import { NxAddSvgSrcDirective } from '@directives/add-data.directive';
import { AuthGuard } from '@guards/authGuard';
import { TwofaGuard } from '@guards/twofaGuard';
import { PipesModule } from '@pipes/pipes.module';

import { NxCameraDetailsComponent } from './components/camera-details/camera-details.component';
import { NxSystemViewCameraPageComponent } from './pages/system-view-camera/system-view-camera.page.component';
import { NxSystemViewIndexPageComponent } from './pages/system-view-index/system-view-index.page.component';
import { VmsClientPlaybackModule } from './vms-client/submodules/playback/playback.module';
import { VmsClientTimelineModule } from './vms-client/submodules/timeline/timeline.module';
import { VmsClientVmsModule } from './vms-client/submodules/vms/vms.module';
import { VmsClientModule } from './vms-client/vms-client.module';

@NgModule({
    imports: [
        CommonModule,
        RouterModule,
        RouterModule.forChild([
            {
                path: '',
                component: NxSystemViewIndexPageComponent,
                canActivate: [AuthGuard, TwofaGuard],
                children: [
                    {
                        path: ':cameraId',
                        component: NxSystemViewCameraPageComponent,
                    },
                ],
            },
        ]),
        TranslateModule,
        AngularSvgIconModule,
        NxClientButtonComponent,
        NxPagePlaceholderComponent,
        NxPlayerPlaceholderComponent,
        PipesModule,
        NxPreLoaderComponent,
        VmsClientPlaybackModule,
        VmsClientTimelineModule,
        VmsClientVmsModule,
        VmsClientModule,
        NxAddSvgSrcDirective,
    ],
    providers: [CookieService],
    declarations: [
        NxSystemViewIndexPageComponent,
        NxSystemViewCameraPageComponent,
        NxCameraDetailsComponent,
    ],
    bootstrap: [],
    exports: [NxSystemViewIndexPageComponent],
})
export class NxSystemViewModule {}
