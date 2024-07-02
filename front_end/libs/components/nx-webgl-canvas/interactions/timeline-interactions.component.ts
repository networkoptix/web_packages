import { CommonModule } from '@angular/common';
import { Component, effect, HostBinding, input, Input } from '@angular/core';
import { UntilDestroy } from '@ngneat/until-destroy';

import { NxClickDoubleDirective } from '@directives/nx-single-double-click.directive';

import { ACTIONS, MODE } from '../actions/timeline-actions.types';
import { NxWebGLService } from '../services/webgl.service';

import { WebGlTimelinePlaybackIndicatorComponent } from './playback-indicator/timeline-playback-indicator.component';
import { WebGlTimelineSelectionComponent } from './selection/timeline-selection.component';
import { WebGlTimeUnderMouseComponent } from './time-under-mouse/time-under-mouse.component';

@UntilDestroy()
@Component({
    selector: 'nx-timeline-interactions',
    templateUrl: './timeline-interactions.component.html',
    styleUrls: ['./timeline-interactions.component.scss'],
    standalone: true,
    imports: [
        CommonModule,
        WebGlTimeUnderMouseComponent,
        WebGlTimelinePlaybackIndicatorComponent,
        WebGlTimelineSelectionComponent,
        NxClickDoubleDirective,
    ],
})
export class WebGlTimelineInteractionsComponent {
    @Input() actions: ACTIONS = {
        mode: MODE.DRAG,
        jumpTo: 0,
    };

    zoomInProcess$$ = input<boolean>(false, { alias: 'zoomInProcess' });

    // @Output() scrollToPos = new EventEmitter<{
    //     direction: SCROLL_DIRECTION;
    //     position: number;
    // }>();

    @HostBinding('style') hostStyle: string;

    timeUnderPosition: number | undefined;
    // playbackPosition: number | undefined;
    selectionHover: boolean = false;

    protected readonly MODE = MODE;

    constructor(private webglService: NxWebGLService) {
        effect(() => {
            if (this.zoomInProcess$$()) {
                this.hostStyle = 'pointer-events: none';
            }
        });
    }

    // handleMouseMove(event: MouseEvent): void {
    //     if (
    //         !(
    //             this.webglService.selectionDrag$.value ||
    //             this.webglService.selection$.value.drag ||
    //             this.selectionHover
    //         )
    //     ) {
    //         this.timeUnderPosition = event.offsetX;
    //     } else {
    //         this.timeUnderPosition = undefined; // hide while dragging
    //     }
    //
    //     this.webglService.currentPointer$.next(this.timeUnderPosition);
    // }

    // handleMouseLeave(): void {
    //     this.timeUnderPosition = undefined;
    //     this.webglService.currentPointer$.next(undefined);
    // }
    //
    // handleMouseEnter(event: MouseEvent): void {
    //     this.timeUnderPosition = event.offsetX;
    // }

    // handleMouseWheel(event: WheelEvent): void {
    //     event.preventDefault();
    //     // leave this to canvas
    //     this.hostStyle = 'pointer-events: none';
    // }

    handleSelectionOnHover(status: boolean): void {
        this.selectionHover = status;
    }

    handleMouseClick(event: MouseEvent): void {
        if (!this.webglService.selectionDrag$.value && this.actions.mode === MODE.DRAG) {
            this.webglService.playbackPosition$$.set(event.offsetX);
        }
    }

    // Selection
    // handleMouseHold(event: Event, hold: boolean): void {
    //     event.preventDefault();
    //     if (hold) {
    //         this.scrollToPos.emit({
    //             direction: SCROLL_DIRECTION.scrollTo,
    //             position: (event as MouseEvent).offsetX,
    //         });
    //     }
    // }

    // getSelectionDate(coordX: number): void {
    //     this.playbackPosition = undefined;
    //     this.webglService.currentPointer$.next(this.chart.xInvert(coordX));
    // }
}
