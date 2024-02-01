import { CommonModule } from '@angular/common';
import { Component, Input, inject } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';

import { nxConfig } from '@services/nx-config/config';

import { RenderStateModel } from './render-state-model';
import { NxWebGLService } from './services/webgl.service';
import { TimelineDataModel } from './timeline-data-model';

@Component({
    selector: 'nx-timeline-debug',
    standalone: true,
    imports: [CommonModule, TranslateModule],
    template: `
        <div
            *ngIf="nxConfig.timelineDebugData && dataState.state$$().allCamerasData?.length"
            style="
        position: absolute;
        width: 700px;
        left: 100px;
        bottom: 300px;
        background-color: grey;
        color: white;
        padding: 1rem;
    "
        >
            <div class="row mt-3">
                <div class="col-3">
                    <span>{{ 'zLevel' | translate }}</span> : {{ webglService.levelZoom$.value }}
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
                    {{ webglService.selection$.value.drag }} <br />
                </div>
                <div class="col-9">
                    <span>{{ 'px/60s' | translate }}</span> :
                    {{ (renderState.canvasVirtualWidth / renderState.timeFrameInS) * 60 }} <br />
                    <span>{{ 'lastMinuteWidth' | translate }}</span> :
                    {{ renderState.lastMinuteWidth }}
                    <br />
                    <span>{{ 'timeFrameInS' | translate }}</span> : {{ renderState.timeFrameInS }}
                    <br />
                    <span>{{ 'CurrPointer' | translate }}</span> :
                    {{ webglService.currentPointer$.value }} /
                    {{ renderState.debugInfo.timeLabelPosition }}
                    <br />
                    <span>{{ 'PlaybackPointer' | translate }}</span> :
                    {{ renderState.debugInfo.playbackPointer?.getTime() }} /
                    {{ renderState.debugInfo.playbackLabelPosition }}<br />
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

    protected readonly nxConfig = nxConfig;
}
