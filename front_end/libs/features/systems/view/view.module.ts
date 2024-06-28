import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { AngularSvgIconModule } from 'angular-svg-icon';
import { CookieService } from 'ngx-cookie-service';

import { NxVmsClientTextComponent } from '@components/open-vms-client/vms-client-text/vms-client-text.component';
import { NxPagePlaceholderComponent } from '@components/placeholders/page/page-placeholder.component';
import { NxPlayerPlaceholderComponent } from '@components/placeholders/player/player-placeholder.component';
import { NxPreLoaderComponent } from '@components/placeholders/pre-loader/pre-loader.component';
import { NxAddSvgSrcDirective } from '@directives/add-data.directive';
import { PipesModule } from '@pipes/pipes.module';
import { currentSystemResolver } from '@resolvers/current-system-resolver';

import { NxCameraDetailsComponent } from './components/camera-details/camera-details.component';
import { MediaServerListComponent } from './components/media-server-list/media-server-list.component';
import { PlaybackControlsComponent } from './components/playback-controls/playback-controls.component';
import { PlaybackStateIndicatorComponent } from './components/playback-state-indicator/playback-state-indicator.component';
import { PlayerComponent } from './components/player/player.component';
import { NxSystemViewCameraPageComponent } from './pages/system-view-camera/system-view-camera.page.component';
import { NxSystemViewIndexPageComponent } from './pages/system-view-index/system-view-index.page.component';
import { VmsClientTimelineModule } from './vms-client/submodules/timeline/timeline.module';

@NgModule({
    imports: [
        CommonModule,
        RouterModule,
        RouterModule.forChild([
            {
                path: '',
                component: NxSystemViewIndexPageComponent,
                children: [
                    {
                        path: ':cameraId',
                        component: NxSystemViewCameraPageComponent,
                        resolve: {
                            system: currentSystemResolver,
                        },
                    },
                ],
                resolve: {
                    system: currentSystemResolver,
                },
            },
        ]),
        TranslateModule,
        AngularSvgIconModule,
        NxPagePlaceholderComponent,
        NxPlayerPlaceholderComponent,
        PipesModule,
        NxPreLoaderComponent,
        VmsClientTimelineModule,
        NxAddSvgSrcDirective,
        MediaServerListComponent,
        PlaybackControlsComponent,
        PlaybackStateIndicatorComponent,
        PlayerComponent,
        NxVmsClientTextComponent,
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
