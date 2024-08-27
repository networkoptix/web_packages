import { CommonModule } from '@angular/common';
import { Component, Input, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';

import { NxCheckboxComponent } from '@components/checkbox/checkbox.component';

import { RenderStateModel } from './render-state-model';
import { NxWebGLService } from './services/webgl.service';
import { TimelineDataModel } from './timeline-data-model';

@Component({
    selector: 'nx-timeline-debug',
    standalone: true,
    imports: [CommonModule, TranslateModule, NxCheckboxComponent, FormsModule],
    template: `
        <div
            style="
                position: absolute;
                bottom: 20px;
                background-color: lightgrey;
                color: black;
                padding: 1rem;
                width: calc(100% - 30px);
            "
        >
            <div class="row mt-3">
                <div class="col-3">
                    <div>
                        <span>{{ 'Camera count' | translate }}</span> :
                        {{ dataState.state$$()?.camerasCount }} <br />
                        <span>{{ 'Data length' | translate }}</span> :
                        {{ dataState.state$$().allCamerasData?.length }}
                    </div>

                    <div class="d-flex mb-1">
                        <nx-checkbox
                            [componentId]="'setAxis'"
                            [ngModel]="renderState.timelineAxisEnabled$$()"
                            (ngModelChange)="renderState.toggleTimelineAxisEnabled($event)"
                        ></nx-checkbox>
                        <label
                            class="d-flex align-content-center flex-wrap mb-0"
                            for="setAxis"
                        >
                            <span>{{ 'Axis X' | translate }}</span>
                        </label>
                    </div>
                    <div class="d-flex mb-1">
                        <nx-checkbox
                            [componentId]="'setActions'"
                            [ngModel]="renderState.timelineActionsEnabled$$()"
                            (ngModelChange)="renderState.toggleTimelineActionsEnabled($event)"
                        ></nx-checkbox>
                        <label
                            class="d-flex align-content-center flex-wrap mb-0"
                            for="setActions"
                        >
                            <span>{{ 'Actions' | translate }}</span>
                        </label>
                    </div>
                </div>
                <br />
                <div class="col-3">
                    <span>{{ 'zLevel' | translate }}</span> : {{ webglService.levelZoom$$() }}
                    <br />
                    <span>{{ 'xPos' | translate }}</span> : {{ renderState.xPos }} <br />
                    <span>{{ 'canvas' | translate }}</span> : {{ webglService.canvasWidth$.value }}
                    <br />
                    <span>{{ 'width' | translate }}</span> : {{ renderState.canvasVirtualWidth }}
                    <br />
                    <span>{{ 'LMPos' | translate }}</span> :
                    {{
                        Math.trunc(
                            -(
                                renderState.canvasVirtualWidth -
                                webglService.canvasWidth$.value +
                                renderState.xPos
                            ) || 0
                        )
                    }}
                    <br />
                    <span>{{ 'BarPos' | translate }}</span> : {{ renderState.scrollBarPos$$() }}
                    <br />
                    <span>{{ 'BarWidth' | translate }}</span> :
                    {{ renderState.scrollBarWidth$$() }} <br />
                    <span>{{ 'Sel' | translate }}</span> : {{ webglService.selectionDrag$.value }} /
                    {{ webglService.selection$.value.drag }}
                    <br />
                    <span>{{ 'px/60s' | translate }}</span> :
                    {{ (renderState.canvasVirtualWidth / renderState.timeFrameInS) * 60 }} <br />
                    <span>{{ 'lastMinuteWidth' | translate }}</span> :
                    {{ renderState.lastMinuteWidth }}
                    <br />
                    <span>{{ 'timeFrameInS' | translate }}</span> : {{ renderState.timeFrameInS }}
                </div>
                <div class="col-6">
                    <span>{{ 'CurrPointer' | translate }}</span> :
                    {{ this.webglService.currentPointer$$() }} /
                    {{ webglService.xScale$$().invert(this.webglService.currentPointer$$() || 0) }}
                    <br />
                    <span>{{ 'PlaybackPosition' | translate }}</span> :
                    {{ renderState.debugInfo.playbackTime }}
                    <br />
                    <span>{{ 'PlaybackTime' | translate }}</span> :
                    {{ webglService.playbackPosition$$() }} /
                    {{ webglService.xScale$$().invert(webglService.playbackPosition$$() || 0) }}
                    <br />

                    <span>{{ 'lastChunkStart' | translate }}</span> :
                    {{ renderState.debugInfo.lastDataDateStart }}<br />
                    <span>{{ 'lastChunkEnd' | translate }}</span> :
                    {{ renderState.debugInfo.lastDataDateEnd }}<br />
                    <span>{{ 'Selection start' | translate }}</span> :
                    {{ webglService.selection$.value.startDisplay }}<br />
                    <span>{{ 'Selection end' | translate }}</span> :
                    {{ webglService.selection$.value.endDisplay }}<br />
                    <span>{{ 'Overall days' | translate }}</span> :
                    {{ renderState.debugInfo.overallDays }}
                    <br />
                    <span>{{ 'Domain' | translate }}</span> :
                    {{ renderState.debugInfo.xScale?.domain()[0] }}
                    <br />
                </div>
            </div>
        </div>
    `,
})
export class NxTimelineDebugComponent {
    @Input({ required: true }) dataState: TimelineDataModel;
    @Input({ required: true }) renderState: RenderStateModel;

    protected webglService = inject(NxWebGLService);

    protected readonly Math = Math;
}
