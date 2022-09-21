import { NgModule } from '@angular/core';

import { ComponentsCommonModule } from '@components/components-common.module';
import { ComponentsCoreModule } from '@components/components-core.module';

import { NxVideoPlayerComponent } from './video-player.component';

@NgModule({
    imports: [
        ComponentsCoreModule,
        ComponentsCommonModule
    ],
    declarations: [
        NxVideoPlayerComponent
    ],
    providers: [
        NxVideoPlayerComponent
    ],
    exports: [
        NxVideoPlayerComponent
    ]
})
export class VideoPlayerModule { }
