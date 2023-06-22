import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';

import { PreLoaderModule } from '@components/placeholders/pre-loader/pre-loader.module';
import { DirectivesModule } from '@directives/directives.module';
import { PipesModule } from '@pipes/pipes.module';
import { ServiceModule } from '@services/services.module';

import { NxVideoPlayerComponent } from './video-player.component';

@NgModule({
    imports: [CommonModule, DirectivesModule, PipesModule, PreLoaderModule, ServiceModule],
    declarations: [NxVideoPlayerComponent],
    providers: [NxVideoPlayerComponent],
    exports: [NxVideoPlayerComponent],
})
export class VideoPlayerModule {}
