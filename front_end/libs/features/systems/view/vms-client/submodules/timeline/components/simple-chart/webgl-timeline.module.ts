import { DragDropModule } from '@angular/cdk/drag-drop';
import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { AngularSvgIconModule } from 'angular-svg-icon';

import { DirectivesModule } from '@directives/directives.module';
import {
    SimpleNxWebGLCanvasComponent
} from '@vms-client/submodules/timeline/components/simple-chart/webgl-canvas.component';

@NgModule({
    declarations: [
        SimpleNxWebGLCanvasComponent,
    ],
    exports: [
        SimpleNxWebGLCanvasComponent,
    ],
    imports: [
        CommonModule,
        AngularSvgIconModule.forRoot(),
        TranslateModule,
        DragDropModule,
        DirectivesModule,
    ],
    providers: []
})
export class SimpleWebGLTimelineModule {
}
