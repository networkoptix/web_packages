import {
    Component,
    ElementRef,
    EventEmitter,
    Input,
    OnChanges,
    Output,
    ViewChild,
} from '@angular/core';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { isEqual } from 'lodash-es';
import { animationFrameScheduler, distinctUntilChanged, interval, Subject, takeUntil } from 'rxjs';

import { NxLanguageProviderService } from '@services/nx-language-provider';
import { NgChanges } from '@utils/ng-changes';
import { SCROLL_DIRECTION } from '@vms-client/submodules/timeline/components/nx-webgl-canvas/scroll/scroll.types';
import { NxWebGLService } from '@vms-client/submodules/timeline/components/nx-webgl-canvas/services/webgl.service';

import { ExportSelection, SELECTION_ACTION } from './selection.types';

const MARGIN = 5;
const HANDLE_ADJ = 1;
const ARROW_WIDTH = 10;
const PRIMARY_WIDTH = 140;

enum EDGE_SCROLLING_SPEED {
    NONE = 0,
    SLOW = 1,
    MEDIUM = 2,
    FAST = 3,
}

enum EDGE_SCROLLING_SPEED_POS {
    FAR = 80,
    MID = 40,
    NEAR = 20,
}

@UntilDestroy()
@Component({
    selector: 'nx-webgl-timeline-selection',
    templateUrl: './timeline-selection.component.html',
    styleUrls: ['./timeline-selection.component.scss'],
})
export class WebGlTimelineSelectionComponent implements OnChanges {
    // @Input() cursorTime: Date;
    @Input() position: number | undefined;

    @Output() onHover = new EventEmitter<boolean>();
    @Output() posChange = new EventEmitter<number>();
    @Output() scrollShift = new EventEmitter<{
        direction: SCROLL_DIRECTION;
        position: number;
    }>();

    SELECTION_ACTION = SELECTION_ACTION;

    public hideLeftEar: boolean = false;
    public hideRightEar: boolean = false;

    // private selectionMode: boolean;
    leftEarViewLeft: number;
    rightEarViewRight: number;

    left: number;
    right: number;
    offset: number;

    @ViewChild('selectedRange')
    protected selectedRangeView: ElementRef<HTMLDivElement>;

    @ViewChild('leftEar', { static: true })
    protected leftEarView: ElementRef<HTMLDivElement>;

    @ViewChild('rightEar', { static: true })
    protected rightEarView: ElementRef<HTMLDivElement>;

    selection: ExportSelection;

    mouseOverEar: boolean = false;
    dragLeft: boolean = false;
    dragRight: boolean = false;
    canvasWidth: number;

    dragStop$: Subject<boolean> = new Subject<boolean>();

    constructor(languageService: NxLanguageProviderService, private webglService: NxWebGLService) {
        languageService.loadTimelineTranslations();

        this.webglService.selection$
            .pipe(untilDestroyed(this), distinctUntilChanged(isEqual))
            .subscribe((selection: ExportSelection) => {
                this.selection = selection;
                this.leftEarPosition();
                this.rightEarPosition();
            });

        this.webglService.levelZoom$.pipe(untilDestroyed(this)).subscribe(level => {
            if (this.selection.active) {
                this.webglService.updateSelection();
            }
        });

        this.webglService.canvasWidth$.subscribe((width: number) => {
            this.canvasWidth = width;
        });
    }

    ngOnChanges(changes: NgChanges<WebGlTimelineSelectionComponent>): void {
        if (changes.position?.currentValue) {
            if (this.selection.drag) {
                const dateUnder = this.webglService.xScale$.value.invert(
                    changes.position.currentValue,
                );
                if (this.dragLeft || this.selection.leftDate === '') {
                    this.selection.startDate = dateUnder;
                }

                if (this.dragRight || this.selection.rightDate === '') {
                    this.selection.endDate = dateUnder;
                }

                this.webglService.selection$.next(this.selection);
                this.webglService.updateSelection();
            }
        }
    }

    public selectedRangeDoubleClickHandler(event: MouseEvent): void {
        this.webglService.selectionReset();
    }

    selectionHandler(event: MouseEvent, action: SELECTION_ACTION): void {
        if (action === SELECTION_ACTION.start && !this.mouseOverEar && this.selection.active) {
            this.webglService.selectionReset();
        }
        this.selection.drag = action === SELECTION_ACTION.start;

        if (this.selection.drag && !this.selection.active) {
            const offsetX = event.pageX - this.webglService.canvasRect$.value.left;
            this.selection.active = true;
            this.selection.startDisplay = offsetX;
            this.selection.endDisplay = offsetX;
            this.hideLeftEar = false;
            this.hideRightEar = false;

            this.leftEarPosition();
            this.rightEarPosition();

            this.posChange.emit(offsetX);
        }

        if (action === SELECTION_ACTION.end) {
            this.hideLeftEar = true;
            this.hideRightEar = true;
            this.dragRight = false;
            this.dragLeft = false;
            this.dragStop$.next(true);
        }

        this.webglService.selection$.next(this.selection);
    }

    selectionMoveHandler(event: MouseEvent): void {
        if (this.selection.drag) {
            // event.offsetX reports "closest" object, so we get values 0,1,3,4
            // when over selection and 100+ when are over timeline
            const offsetX = event.pageX - this.webglService.canvasRect$.value.left;
            if (
                event.pageX >= this.webglService.canvasRect$.value.right ||
                event.pageX <= this.webglService.canvasRect$.value.left
            ) {
                this.selectionHandler(event, SELECTION_ACTION.end);
                return;
            }

            const duration = offsetX - this.selection.startDisplay;
            const newDrag = this.selection.startDisplay === this.selection.endDisplay;

            if (this.selection.endDisplay + duration < this.selection.startDisplay) {
                this.dragRight = false;
                this.dragLeft = true;
            }

            if (this.selection.startDisplay + duration > this.selection.endDisplay) {
                this.dragRight = true;
                this.dragLeft = false;
            }

            if (duration > 0 && (this.dragRight || newDrag)) {
                this.dragRight = true;
                this.selection.endDisplay = offsetX;
                this.posChange.emit(offsetX);

                this.scroll(SCROLL_DIRECTION.right);
                this.rightEarPosition();
            }
            if ((duration <= 0 && (this.dragLeft || newDrag)) || (duration > 0 && this.dragLeft)) {
                this.dragLeft = true;
                this.selection.startDisplay = offsetX;
                this.posChange.emit(offsetX);

                this.scroll(SCROLL_DIRECTION.left);
                this.leftEarPosition();
            }

            this.webglService.selection$.next(this.selection);
        }

        this.webglService.selectionDrag$.next(this.selection.drag);
    }

    private scroll(direction: SCROLL_DIRECTION): void {
        if (
            this.webglService.canScroll$.value.right &&
            direction === SCROLL_DIRECTION.right &&
            this.selection.endDisplay > this.canvasWidth - EDGE_SCROLLING_SPEED_POS.FAR
        ) {
            this.dragStop$.next(true);
            const diff = this.canvasWidth - this.selection.endDisplay;
            const step = this.edgeScrollingSpeed(diff);

            interval(0, animationFrameScheduler)
                .pipe(untilDestroyed(this), takeUntil(this.dragStop$))
                .subscribe(() => {
                    this.scrollShift.emit({
                        direction: SCROLL_DIRECTION.scrollTo,
                        position: -step,
                    });
                });
        } else if (
            this.webglService.canScroll$.value.left &&
            direction === SCROLL_DIRECTION.left &&
            this.selection.startDisplay < EDGE_SCROLLING_SPEED_POS.FAR
        ) {
            this.dragStop$.next(true);
            const step = this.edgeScrollingSpeed(this.selection.startDisplay);

            interval(0, animationFrameScheduler)
                .pipe(untilDestroyed(this), takeUntil(this.dragStop$))
                .subscribe(() => {
                    this.scrollShift.emit({ direction: SCROLL_DIRECTION.scrollTo, position: step });
                });
        } else {
            this.dragStop$.next(true);
        }
    }

    private distanceToScrollingSpeed(distanceFromEdge: number): EDGE_SCROLLING_SPEED {
        if (distanceFromEdge > EDGE_SCROLLING_SPEED_POS.FAR) {
            return EDGE_SCROLLING_SPEED.NONE;
        }
        if (distanceFromEdge > EDGE_SCROLLING_SPEED_POS.MID) {
            return EDGE_SCROLLING_SPEED.SLOW;
        }
        if (distanceFromEdge > EDGE_SCROLLING_SPEED_POS.NEAR) {
            return EDGE_SCROLLING_SPEED.MEDIUM;
        }
        return EDGE_SCROLLING_SPEED.FAST;
    }

    private edgeScrollingSpeed(pos: number): EDGE_SCROLLING_SPEED {
        return this.distanceToScrollingSpeed(pos);
    }

    rightEarPosition(): void {
        if (this.selection.endDisplay > this.selection.startDisplay) {
            if (this.selection.endDisplay + PRIMARY_WIDTH - 4 >= this.canvasWidth) {
                this.rightEarViewRight = this.selection.endDisplay - this.canvasWidth - 4;
            } else {
                this.rightEarViewRight = -PRIMARY_WIDTH;
            }
        }
    }

    leftEarPosition(): void {
        this.leftEarViewLeft = -PRIMARY_WIDTH;
        if (this.selection.startDisplay - PRIMARY_WIDTH <= 0) {
            const padding = this.selection.startDisplay - PRIMARY_WIDTH;
            this.leftEarViewLeft = -PRIMARY_WIDTH - padding;
        }
    }

    public get svgLeftArrowPoints(): string {
        let tl: number;
        let tr: number;
        let b: number;

        if (!this.hideLeftEar) {
            const offset = this.selection.startDisplay - PRIMARY_WIDTH;

            tl = this.selection.startDisplay - offset - ARROW_WIDTH / 2;
            tr = this.selection.startDisplay - offset;
            b = this.selection.startDisplay - offset;

            if (offset < 0) {
                tl = this.selection.startDisplay - MARGIN - HANDLE_ADJ;
                tr = this.selection.startDisplay + MARGIN - HANDLE_ADJ;
                b = this.selection.startDisplay - HANDLE_ADJ;

                if (offset < -PRIMARY_WIDTH + MARGIN) {
                    tr = MARGIN;
                }
            }

            return `${tl},0 ${tr},0 ${b},5`;
        }
    }

    public get svgRightArrowPoints(): string {
        let tl: number;
        let tr: number;
        let b: number;

        if (!this.hideRightEar) {
            const canvasWidth = this.canvasWidth;
            const offset = this.selection.endDisplay - canvasWidth + PRIMARY_WIDTH;

            if (offset > 0) {
                tl = offset - MARGIN - 3 * HANDLE_ADJ;
                tr = offset + MARGIN - 3 * HANDLE_ADJ;
                b = offset - 3 * HANDLE_ADJ;
            } else {
                tl = 0;
                tr = ARROW_WIDTH / 2;
                b = 0;
            }

            return `${tl},0 ${tr},0 ${b},5`;
        }
    }

    public leftEarMouseHandler(event: MouseEvent, action: SELECTION_ACTION): void {
        this.dragLeft = this.selection.drag;
        this.hideLeftEar = false;
        this.hideRightEar = false;
    }

    public rightEarMouseHandler(event: MouseEvent, action: SELECTION_ACTION): void {
        this.dragRight = this.selection.drag;
        this.hideRightEar = false;
        this.hideLeftEar = false;
    }

    public rightEarMouseInOutHandler(status: boolean): void {
        if (!this.selection.drag) {
            this.onHover.emit(status);
            this.mouseOverEar = status;
            this.hideRightEar = !status;
        }
    }

    public leftEarMouseInOutHandler(status: boolean): void {
        if (!this.selection.drag) {
            this.onHover.emit(status);
            this.mouseOverEar = status;
            this.hideLeftEar = !status;
        }
    }
}
