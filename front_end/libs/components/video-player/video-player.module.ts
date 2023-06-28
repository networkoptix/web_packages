import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';

import { NxPreLoaderComponent } from '@components/placeholders/pre-loader/pre-loader.component';
import { DirectivesModule } from '@directives/directives.module';
import { PipesModule } from '@pipes/pipes.module';
import { ServiceModule } from '@services/services.module';

import { NxVideoPlayerComponent } from './video-player.component';

@NgModule({
    imports: [CommonModule, DirectivesModule, PipesModule, NxPreLoaderComponent, ServiceModule],
    declarations: [NxVideoPlayerComponent],
    providers: [NxVideoPlayerComponent],
    exports: [NxVideoPlayerComponent],
})
export class VideoPlayerModule {}
