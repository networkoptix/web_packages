import { DragDropModule } from '@angular/cdk/drag-drop';
import { CdkTreeModule } from '@angular/cdk/tree';
import { NgModule } from '@angular/core';
import { AngularSvgIconModule } from 'angular-svg-icon';

import { ComponentsCommonModule } from '@components/components-common.module';
import { ComponentsCoreModule } from '@components/components-core.module';
import { MonitoringGraphModule } from '@components/graph/graph.module';
import { VideoPlayerModule } from '@components/video-player/video-player.module';

import { NxLayoutGridComponent } from './layout-grid.component';

@NgModule({
    imports: [
        ComponentsCoreModule,
        VideoPlayerModule,
        ComponentsCommonModule,
        DragDropModule,
        CdkTreeModule,
        MonitoringGraphModule,
        AngularSvgIconModule.forRoot(),
    ],
    declarations: [
        NxLayoutGridComponent
    ],
    providers: [
        NxLayoutGridComponent
    ],
    exports: [
        NxLayoutGridComponent
    ]
})

export class LayoutGridModule { }
