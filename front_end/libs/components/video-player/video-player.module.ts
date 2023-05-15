import { NgModule } from '@angular/core';

import { ComponentsCommonModule } from '@components/components-common.module';
import { ComponentsCoreModule } from '@components/components-core.module';
import { DirectivesModule } from '@directives/directives.module';
import { ServiceModule } from '@services/services.module';

import { NxVideoPlayerComponent } from './video-player.component';

@NgModule({
    imports: [
        ComponentsCoreModule,
        ComponentsCommonModule,
        DirectivesModule,
        ServiceModule
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
