import { Component, EventEmitter, HostBinding, Input, OnChanges, Output } from '@angular/core';
import { UntilDestroy } from '@ngneat/until-destroy';

// import * as d3 from 'd3';
import { NgChanges } from '@utils/ng-changes';
import {
    ACTIONS,
    MODE,
} from '@vms-client/submodules/timeline/components/nx-webgl-canvas/actions/timeline-actions.types';
import { SCROLL_DIRECTION } from '@vms-client/submodules/timeline/components/nx-webgl-canvas/scroll/scroll.types';
import { NxWebGLService } from '@vms-client/submodules/timeline/components/nx-webgl-canvas/services/webgl.service';
// import {
//     ZOOM_DURATION,
//     ZOOM_FACTOR,
// } from '@vms-client/submodules/timeline/components/nx-webgl-canvas/zoom/zoom.types';

@UntilDestroy()
@Component({
    selector: 'nx-timeline-interactions',
    templateUrl: './timeline-interactions.component.html',
    styleUrls: ['./timeline-interactions.component.scss'],
})
export class WebGlTimelineInteractionsComponent implements OnChanges {
    // eslint-disable-next-line nx/explicit-angular-boundary-types
    @Input() chart;
    // eslint-disable-next-line nx/explicit-angular-boundary-types
    @Input() zoomInProcess: boolean;
    @Input() actions: ACTIONS;

    @Output() scrollToPos = new EventEmitter<{
        direction: SCROLL_DIRECTION;
        position: number;
    }>();

    @HostBinding('style') hostStyle: string;

    cursorPosition: number | undefined;
    timeUnderPosition: number | undefined;
    playbackPosition: number | undefined;
    selectionHover: boolean = false;

    constructor(private webglService: NxWebGLService) {}

    ngOnChanges(changes: NgChanges<WebGlTimelineInteractionsComponent>): void {
        if (changes.zoomInProcess) {
            this.hostStyle = changes.zoomInProcess.currentValue ? 'pointer-events: none' : '';
        }
    }

    handleMouseMove(event: MouseEvent): void {
        // avoid triggering at bottom scroll area
        if (event.offsetY > 5) {
            this.cursorPosition = event.offsetX;
        }

        if (
            !(
                this.webglService.selectionDrag$.value ||
                this.webglService.selection$.value.drag ||
                this.selectionHover
            )
        ) {
            this.timeUnderPosition = this.cursorPosition;
        } else {
            this.timeUnderPosition = undefined; // hide while dragging
        }
    }

    handleMouseLeave(): void {
        this.cursorPosition = undefined;
        this.timeUnderPosition = undefined;
    }

    handleMouseWheel(event: WheelEvent): void {
        event.preventDefault();
        // leave this to canvas
        this.hostStyle = 'pointer-events: none';
    }

    handleSelectionOnHover(status: boolean): void {
        this.selectionHover = status;
    }

    handleMouseClick(event: MouseEvent): void {
        if (!this.webglService.selectionDrag$.value && this.actions.mode === MODE.DRAG) {
            this.playbackPosition = this.cursorPosition;
        }
    }

    handleMouseHold(event: MouseEvent, hold: boolean): void {
        event.preventDefault();
        if (hold) {
            this.scrollToPos.emit({
                direction: SCROLL_DIRECTION.scrollTo,
                position: event.offsetX,
            });
        }
    }

    // getSelectionDate(coordX: number): void {
    //     this.playbackPosition = undefined;
    //     this.webglService.currentPointer$.next(this.chart.xInvert(coordX));
    // }

    protected readonly MODE = MODE;
}
