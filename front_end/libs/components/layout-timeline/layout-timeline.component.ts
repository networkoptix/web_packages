// import { Location } from '@angular/common';
import { Component, ElementRef, Input, ViewChild } from '@angular/core';
import { clamp, isArray, uniq } from 'lodash-es';

import staticLang from '@common/language/language_i18n_static.json';
import { LayoutResourceTree } from '@components/layout-grid/layout-grid.types';
import { WebRTCStreamManager } from '@openLibs/webrtc-stream-manager';
import { TimeDetail } from '@services/system.service/camera-manager/camera-manager-types';
import { NgChanges } from '@utils/ng-changes';

@Component({
    selector: 'nx-layout-timeline',
    templateUrl: 'layout-timeline.component.html',
    styleUrls: ['layout-timeline.component.scss'],
})
export class NxLayoutTimelineComponent {
    @Input() cameras: string[];
    @Input() layoutItemLookup: LayoutResourceTree;
    @Input() records: TimeDetail[];
    @ViewChild('timelineCanvas') timelineCanvas: ElementRef<HTMLCanvasElement>;

    height = 1;
    width = 36000;
    scale = 100;
    MIN_ZOOM = 100;
    position = 0;
    MAX_ZOOM = 10995.1163;
    tooltipDetails: { selected: string[]; position: number; x: number; xActual: number } = {
        selected: [],
        position: 0,
        x: 0,
        xActual: 0,
    };

    LANG = staticLang;

    get pixelSize(): number {
        return Math.max(
            (Math.round(this.width / this.timelineCanvas.nativeElement.clientWidth) / 100) *
                this.scale,
            1,
        );
    }

    get canvasWrapper(): HTMLElement {
        return this.timelineCanvas?.nativeElement?.parentElement;
    }

    get scrollLeft(): number {
        return this.canvasWrapper?.scrollLeft;
    }

    get scrollWidth(): number {
        return this.canvasWrapper?.scrollWidth;
    }

    get clientWidth(): number {
        return this.canvasWrapper?.clientWidth;
    }

    get endScroll(): number {
        return this.clientWidth + this.scrollLeft;
    }

    scroll(forwards = false): void {
        let amount = this.clientWidth * 0.75;
        if (!forwards) {
            amount *= -1;
        }
        this.canvasWrapper.scrollLeft = clamp(this.scrollLeft + amount, 0, this.endScroll);
    }

    zoom(amount: number): void {
        this.scale = clamp(this.scale * amount, this.MIN_ZOOM, this.MAX_ZOOM);
    }

    updateTooltip = (event: MouseEvent): void => {
        const { clientX, target } = event;
        const canvasWrapper = (target as HTMLCanvasElement).parentNode as HTMLDivElement;
        const scrollLeft = canvasWrapper.scrollLeft;
        const canvasX = clientX + scrollLeft;
        const mousePosition = (this.#getCanvasSize(canvasX) / this.scale) * 100;
        const nextRecord = this.records.find(
            ({ start, end }) =>
                (start <= mousePosition && end >= mousePosition) || start >= mousePosition,
        ) || { start: 0, end: 0, startTimeMs: 0, endTimeMs: 0, durationMs: 0 };
        const chunkPosition = nextRecord.end - Math.max(mousePosition, nextRecord.start) + 1;
        const length = nextRecord.end - nextRecord.start + 1;
        const chunkRatio = 1 - chunkPosition / length;
        const position = nextRecord.startTimeMs + chunkRatio * nextRecord.durationMs;
        // const offset = mousePosition / this.width * this.pixelSize * 8 / 100 * this.scale;
        const start =
            (Math.max(nextRecord.start, 0, mousePosition) / this.pixelSize / 100) * this.scale -
            scrollLeft;
        const tooltipWidth = 216;
        const x = Math.min(
            Math.max(start - (tooltipWidth / canvasWrapper.clientWidth) * start, 0),
            canvasWrapper.clientWidth - tooltipWidth,
        );
        const selected = uniq(
            this.records
                .filter(({ start, end }) => {
                    const pointer = Math.max(nextRecord.start, mousePosition);
                    return start <= pointer && end >= pointer;
                })
                .map(({ cameraId }) => this.layoutItemLookup[cameraId]?.name || cameraId),
        );
        this.tooltipDetails = { selected, position, x, xActual: start };
    };

    updatePosition = (position?: number): void => {
        this.position =
            (typeof position === 'number' ? position : this.tooltipDetails.position) * 1000;
        WebRTCStreamManager.updatePosition(this.position);
    };

    togglePlaying(): void {
        WebRTCStreamManager.togglePlaying(!this.playing);
    }

    get playing(): boolean {
        return WebRTCStreamManager.getPlaying();
    }

    clearTooltip(): void {
        this.tooltipDetails = { selected: [], position: 0, x: 0, xActual: 0 };
        if (this.records) {
            this.draw();
        }
    }

    #getCanvasSize = (x: number): number => {
        return x * this.pixelSize;
    };

    #calcPosition = (
        record: Pick<TimeDetail, 'start' | 'end'>,
    ): Pick<TimeDetail, 'start' | 'end'> => {
        let { start, end } = record;
        const initialSize = end - start;
        const minSize = this.pixelSize;
        if (initialSize < minSize) {
            start = Math.max(start - Math.round((minSize - initialSize) / 2), 0);
            end = start + minSize;
        }
        start += 0.5;
        end += 0.5;
        return { start, end };
    };

    #drawRecord = (
        record: Pick<TimeDetail, 'start' | 'end'>,
        context: CanvasRenderingContext2D,
    ): void => {
        const { start, end } = this.#calcPosition(record);
        context.moveTo(start, 0);
        context.lineTo(end, 0);
    };

    #clear = (): void =>
        this.timelineCanvas.nativeElement.getContext('2d').clearRect(0, 0, this.width, this.height);

    private draw();
    private draw(records: TimeDetail[]);
    private draw(position: number);
    private draw(records: TimeDetail[], position: number);
    private draw(recordsOrPosition: TimeDetail[] | number = 0, position?: number): void {
        const timeDetailArg = isArray(recordsOrPosition);
        const records = timeDetailArg ? recordsOrPosition : this.records;
        if (!timeDetailArg) {
            position = recordsOrPosition;
        }
        this.#clear();
        const context = this.timelineCanvas.nativeElement.getContext('2d');
        context.strokeStyle = 'green';
        context.beginPath();
        for (const record of records) {
            this.#drawRecord(record, context);
        }

        if (position) {
            context.stroke();
            context.beginPath();
            const start = position + 4 > this.width ? position - 4 : Math.max(position - 2, 0);
            const end = start + 4;
            context.strokeStyle = 'blue';
            this.#drawRecord({ start, end }, context);
        }
        context.stroke();
    }

    ngOnChanges({ records }: NgChanges<NxLayoutTimelineComponent>): void {
        if (records?.currentValue) {
            this.draw();
        } else {
            this.#clear();
        }
    }
}
