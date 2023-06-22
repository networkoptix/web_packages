import { DragDropModule } from '@angular/cdk/drag-drop';
import { CdkTreeModule } from '@angular/cdk/tree';
import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { AngularSvgIconModule } from 'angular-svg-icon';
import { TourMatMenuModule } from 'ngx-ui-tour-md-menu';

import { MonitoringGraphModule } from '@components/graph/graph.module';
import { PreLoaderModule } from '@components/placeholders/pre-loader/pre-loader.module';
import { VideoPlayerModule } from '@components/video-player/video-player.module';
import { DirectivesModule } from '@directives/directives.module';
import { ResizeModule } from '@directives/resize/resize.module';
import { NxImageComponent } from '@pages/health/table-components/image/image.component';
import { PipesModule } from '@pipes/pipes.module';

import { NxLayoutGridComponent } from './layout-grid.component';

@NgModule({
    imports: [
        CommonModule,
        TranslateModule,
        AngularSvgIconModule,
        CdkTreeModule,
        DragDropModule,
        DirectivesModule,
        MonitoringGraphModule,
        NxImageComponent,
        PipesModule,
        PreLoaderModule,
        ResizeModule,
        TourMatMenuModule,
        VideoPlayerModule,
    ],
    declarations: [NxLayoutGridComponent],
    providers: [NxLayoutGridComponent],
    exports: [NxLayoutGridComponent],
})
export class LayoutGridModule {}
