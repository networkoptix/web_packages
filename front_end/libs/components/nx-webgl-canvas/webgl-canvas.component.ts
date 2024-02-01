import { CommonModule } from '@angular/common';
import { Component, ElementRef, Input, ViewEncapsulation, inject } from '@angular/core';
import { UntilDestroy } from '@ngneat/until-destroy';
import { TranslateModule } from '@ngx-translate/core';

import { WebGlTimelineActionsComponent } from '@components/nx-webgl-canvas/actions/timeline-actions.component';
import { WebGlTimelineInteractionsComponent } from '@components/nx-webgl-canvas/interactions/timeline-interactions.component';
import { TimelineScrollComponent } from '@components/nx-webgl-canvas/scroll/timeline-scroll.component';
import { NxPreLoaderComponent } from '@components/placeholders/pre-loader/pre-loader.component';
import { NxSystemCamera } from '@services/system.service/camera-manager/camera-manager-types';

import { RenderStateModel } from './render-state-model';
import { NxWebGLService } from './services/webgl.service';
import { TimelineDataModel } from './timeline-data-model';
import { NxTimelineDebugComponent } from './timeline-debug.component';

@UntilDestroy()
@Component({
    selector: 'nx-webgl-canvas',
    templateUrl: 'webgl-canvas.component.html',
    styleUrls: ['webgl-canvas.component.scss'],
    standalone: true,
    encapsulation: ViewEncapsulation.None,
    imports: [
        CommonModule,
        NxPreLoaderComponent,
        WebGlTimelineInteractionsComponent,
        TimelineScrollComponent,
        WebGlTimelineActionsComponent,
        TranslateModule,
        NxTimelineDebugComponent,
    ],
})
export class NxWebGLCanvasComponent {
    protected webglService = inject(NxWebGLService);
    protected elementRef = inject<ElementRef<HTMLElement>>(ElementRef);
    dataModel = new TimelineDataModel();
    renderStateModel = new RenderStateModel(this.dataModel.state$$);

    @Input({ required: true, alias: 'selectedCameraId' }) set selectedCameraIdUpdater(
        camera: string | NxSystemCamera,
    ) {
        this.dataModel.updateSelectedCameraId(typeof camera === 'string' ? camera : camera.id);
    }

    @Input({ required: true, alias: 'cameras' }) set camerasUpdater(cameras: NxSystemCamera[]) {
        this.dataModel.updateCameras(cameras);
    }

    protected readonly Math = Math;
}
