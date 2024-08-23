import { CommonModule } from '@angular/common';
import {
    Component,
    ElementRef,
    Input,
    ViewEncapsulation,
    inject,
    effect,
    viewChild,
    untracked,
    input,
} from '@angular/core';
import { UntilDestroy } from '@ngneat/until-destroy';
import { TranslateModule } from '@ngx-translate/core';

import { NxCheckboxComponent } from '@components/checkbox/checkbox.component';
import { WebGlTimelineActionsComponent } from '@components/nx-webgl-canvas/actions/timeline-actions.component';
import { WebGlTimelinePlaybackIndicatorComponent } from '@components/nx-webgl-canvas/interactions/playback-indicator/timeline-playback-indicator.component';
import { WebGlTimeUnderMouseComponent } from '@components/nx-webgl-canvas/interactions/time-under-mouse/time-under-mouse.component';
import { WebGlTimelineInteractionsComponent } from '@components/nx-webgl-canvas/interactions/timeline-interactions.component';
import { TimelineScrollComponent } from '@components/nx-webgl-canvas/scroll/timeline-scroll.component';
import { NxPreLoaderComponent } from '@components/placeholders/pre-loader/pre-loader.component';
import { nxConfig } from '@services/nx-config/config';
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
        NxCheckboxComponent,
        WebGlTimeUnderMouseComponent,
        WebGlTimelinePlaybackIndicatorComponent,
    ],
})
export class NxWebGLCanvasComponent {
    protected readonly Math = Math;

    protected readonly nxConfig = nxConfig;
    protected webglService = inject(NxWebGLService);
    protected elementRef = inject<ElementRef<HTMLElement>>(ElementRef);
    dataModel = new TimelineDataModel();
    showSaasPlaceholder$$ = input<boolean>(false, { alias: 'showSaasPlaceholder' });
    renderStateModel = new RenderStateModel(this.dataModel.state$$, this.webglService);

    disableInteractionEffect = effect(() => {
        this.renderStateModel.timelineUpdateEnabled = !this.showSaasPlaceholder$$();
    });

    chartElement$$ = viewChild<ElementRef>('chart');
    axisMajorElement$$ = viewChild<ElementRef>('axisMajor');
    axisMinorElement$$ = viewChild<ElementRef>('axisMinor');

    debugMode$$ = input<boolean>(false, { alias: 'debugMode' });

    @Input({ required: true, alias: 'selectedCameraId' }) set selectedCameraIdUpdater(
        camera: string | NxSystemCamera,
    ) {
        const cameraId = typeof camera === 'string' ? camera : camera.id;
        this.dataModel.updateSelectedCameraId(cameraId);
        this.webglService.cameraId$$.set(cameraId);
    }

    @Input({ required: true, alias: 'cameras' }) set camerasUpdater(cameras: NxSystemCamera[]) {
        this.dataModel.updateCameras(cameras);
    }

    constructor() {
        effect(() => {
            if (this.chartElement$$() !== undefined) {
                untracked(() => {
                    this.renderStateModel.chartVisible$$.set(this.chartElement$$()?.nativeElement);
                });
            }
        });

        effect(() => {
            if (this.axisMajorElement$$() !== undefined) {
                untracked(() => {
                    this.renderStateModel.axisMajorVisible$$.set(
                        this.axisMajorElement$$()?.nativeElement,
                    );
                });
            }
        });

        effect(() => {
            if (this.axisMinorElement$$() !== undefined) {
                untracked(() => {
                    this.renderStateModel.axisMinorVisible$$.set(
                        this.axisMinorElement$$()?.nativeElement,
                    );
                });
            }
        });
    }
}
