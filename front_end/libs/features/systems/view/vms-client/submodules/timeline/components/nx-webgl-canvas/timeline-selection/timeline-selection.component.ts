import {
    Component,
    ElementRef,
    EventEmitter,
    Input,
    OnChanges,
    Output,
    ViewChild
} from '@angular/core';
import { UntilDestroy } from '@ngneat/until-destroy';
import dateFormat from 'dateformat';

import { NxLanguageProviderService } from '@services/nx-language-provider';
import { NgChanges } from '@utils/ng-changes';
import { NxWebGLService } from '@vms-client/submodules/timeline/components/nx-webgl-canvas/services/webgl.service';

import { ExportSelection, SELECTION_ACTION } from './selection.types';

const MARGIN = 5;
const HANDLE_ADJ = 1;
const ARROW_WIDTH = 10;
const PRIMARY_WIDTH = 140;

const TIME_FORMAT = 'HH:MM:ss';
const DATE_FORMAT = 'ddd mmm dd yyyy';

@UntilDestroy()
@Component({
    selector: 'nx-webgl-timeline-selection',
    templateUrl: './timeline-selection.component.html',
    styleUrls: ['./timeline-selection.component.scss'],
})
export class WebGlTimelineSelectionComponent implements OnChanges {
    @Input() cursorTime: Date;
    @Output() posChange = new EventEmitter<number>();

    SELECTION_ACTION = SELECTION_ACTION;

    public hideLeftEar: boolean = false;
    public hideRightEar: boolean = false;

    // private selectionMode: boolean;
    leftEarViewLeft: number;
    rightEarViewRight: number;

    left: number;
    right: number;
    duration: number;
    offset: number;

    @ViewChild('selectedRange')
    protected selectedRangeView: ElementRef<HTMLDivElement>;

    @ViewChild('leftEar', { static: true })
    protected leftEarView: ElementRef<HTMLDivElement>;

    @ViewChild('rightEar', { static: true })
    protected rightEarView: ElementRef<HTMLDivElement>;

    selection: ExportSelection = {
        active: false,
        drag: false,
        start: 0,
        end: 0,
        leftDate: '',
        leftTime: '',
        rightDate: '',
        rightTime: '',
    };

    mouseOverEar: boolean = false;
    dragLeft: boolean = false;
    dragRight: boolean = false;

    constructor(
        languageService: NxLanguageProviderService,
        private webglService: NxWebGLService,
    ) {
        languageService.loadTimelineTranslations();
    }

    ngOnChanges(changes: NgChanges<WebGlTimelineSelectionComponent>): void {
        if (changes.cursorTime?.currentValue) {
            if (this.selection.drag) {
                if (this.dragLeft || this.selection.leftDate === '') {
                    this.selection.leftDate = dateFormat(this.cursorTime, DATE_FORMAT);
                    this.selection.leftTime = dateFormat(this.cursorTime, TIME_FORMAT);
                }

                if (this.dragRight || this.selection.rightDate === '') {
                    this.selection.rightDate = dateFormat(this.cursorTime, DATE_FORMAT);
                    this.selection.rightTime = dateFormat(this.cursorTime, TIME_FORMAT);
                }
            }
        }
    }

    private selectionReset(): void {
        this.selection = {
            active: false,
            drag: false,
            start: 0,
            end: 0,
            leftDate: '',
            leftTime: '',
            rightDate: '',
            rightTime: '',
        };
    }

    public selectedRangeDoubleClickHandler(event: MouseEvent): void {
        this.selectionReset();
    }

    selectionHandler(event : MouseEvent, action: SELECTION_ACTION): void {
        if (action === SELECTION_ACTION.start && !this.mouseOverEar && this.selection.active) {
            this.selectionReset();
        }
        this.selection.drag = action === SELECTION_ACTION.start;
        if (this.selection.drag && !this.selection.active) {
            const offsetX = event.pageX - this.webglService.canvasRect$.value.left;
            this.selection.active = true;
            this.selection.start = offsetX;
            this.selection.end = offsetX;
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
        }
    }

    selectionMoveHandler(event : MouseEvent): void {
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

            const duration = offsetX - this.selection.start;
            const newDrag = this.selection.start === this.selection.end;

            console.log(' => ', newDrag, duration, this.selection.start, this.selection.end);

            if (this.selection.end + duration < this.selection.start) {
                this.dragRight = false;
                this.dragLeft = true;
            }

            if (this.selection.start + duration > this.selection.end) {
                this.dragRight = true;
                this.dragLeft = false;
            }

            if (duration > 0 && (this.dragRight || newDrag)) {
                this.dragRight = true;
                this.selection.end = offsetX;
                this.posChange.emit(offsetX);

                this.rightEarPosition();
            }
            if (duration <= 0 && (this.dragLeft || newDrag) || duration > 0 && this.dragLeft) {
                this.dragLeft = true;
                this.selection.start = offsetX;
                this.posChange.emit(offsetX);

                this.leftEarPosition();
            }
        }
    }

    rightEarPosition(): void {
        if (this.selection.end > this.selection.start) {
            if (this.selection.end + PRIMARY_WIDTH - 4 >= this.webglService.canvasWidth$.value) {
                this.rightEarViewRight = this.selection.end - this.webglService.canvasWidth$.value - 4;// - padding;
            } else {
                this.rightEarViewRight = -PRIMARY_WIDTH;
            }
        }
    }

    leftEarPosition(): void {
        this.leftEarViewLeft = -PRIMARY_WIDTH;
        if (this.selection.start - PRIMARY_WIDTH <= 0) {
            const padding = this.selection.start - PRIMARY_WIDTH;
            this.leftEarViewLeft = -PRIMARY_WIDTH - padding;
        }
    }

    public get svgLeftArrowPoints(): string {
        let tl;
        let tr;
        let b;

        if (!this.hideLeftEar) {
            const offset = this.selection.start - PRIMARY_WIDTH;

            tl = this.selection.start - offset - ARROW_WIDTH / 2;
            tr = this.selection.start - offset;
            b = this.selection.start - offset;

            if (offset < 0) {
                tl = this.selection.start - MARGIN - HANDLE_ADJ;
                tr = this.selection.start + MARGIN - HANDLE_ADJ;
                b = this.selection.start - HANDLE_ADJ;

                if (offset < -PRIMARY_WIDTH + MARGIN) {
                    tr = MARGIN;
                }
            }
        }

        return `${tl},0 ${tr},0 ${b},5`;
    }

    public get svgRightArrowPoints(): string {
        let tl;
        let tr;
        let b;
        if (!this.hideRightEar) {
            const canvasWidth = this.webglService.canvasWidth$.value;
            const offset = this.selection.end - canvasWidth + PRIMARY_WIDTH;

            if (offset > 0) {
                tl = offset - MARGIN - 3 * HANDLE_ADJ;
                tr = offset + MARGIN - 3 * HANDLE_ADJ;
                b = offset - 3 * HANDLE_ADJ;
            } else {
                tl = 0;
                tr = ARROW_WIDTH / 2;
                b = 0;
            }
        }

        return `${tl},0 ${tr},0 ${b},5`;
    }

    public leftEarMouseHandler(event: MouseEvent, action: SELECTION_ACTION): void {
        this.selection.drag = action === SELECTION_ACTION.start;
        this.dragLeft = this.selection.drag;
        this.hideLeftEar = false;
        this.hideRightEar = false;
    }

    public rightEarMouseHandler(event: MouseEvent, action: SELECTION_ACTION): void {
        this.selection.drag = action === SELECTION_ACTION.start;
        this.dragRight = this.selection.drag;
        this.hideRightEar = false;
        this.hideLeftEar = false;
    }

    public rightEarMouseInOutHandler(status: boolean): void {
        if (!this.selection.drag) {
            this.mouseOverEar = status;
            this.hideRightEar = !status;
        }
    }

    public leftEarMouseInOutHandler(status: boolean): void {
        if (!this.selection.drag) {
            this.mouseOverEar = status;
            this.hideLeftEar = !status;
        }
    }

    // private distanceToScrollingSpeed(
    //     distanceFromEdge: px,
    // ): EDGE_SCROLLING_SPEED {
    //     if (distanceFromEdge > EDGE_SCROLLING_SPEED_POS.FAR) {
    //         return EDGE_SCROLLING_SPEED.NONE;
    //     }
    //     if (distanceFromEdge > EDGE_SCROLLING_SPEED_POS.MID) {
    //         return EDGE_SCROLLING_SPEED.SLOW;
    //     }
    //     if (distanceFromEdge > EDGE_SCROLLING_SPEED_POS.NEAR) {
    //         return EDGE_SCROLLING_SPEED.MEDIUM;
    //     }
    //     return EDGE_SCROLLING_SPEED.FAST;
    // }

    // private edgeScrollingSpeed(pos): EDGE_SCROLLING_SPEED {
    //     return this.distanceToScrollingSpeed(pos);
    // }
}
