import {
    Component, Input, ViewChild, ElementRef, OnChanges, SimpleChanges, AfterContentChecked, ChangeDetectionStrategy
}                           from '@angular/core';
import { AutoUnsubscribe }  from 'ngx-auto-unsubscribe';
import {
    BehaviorSubject, Subscription, merge, fromEvent, Observable
}                           from 'rxjs';
import { takeUntil, switchMap, pairwise, throttle, throttleTime, filter, distinctUntilChanged, map, startWith, tap } from 'rxjs/operators';
import { animationFrame } from 'rxjs/internal/scheduler/animationFrame';
import { SensitivityColor, Mask, Area, AreaTuple } from './motion-detection-types';

@AutoUnsubscribe()
@Component({
    selector        : 'nx-motion-detection-overlay',
    templateUrl     : 'motion-detection-overlay.component.html',
    styleUrls       : ['motion-detection-overlay.component.scss'],
    changeDetection : ChangeDetectionStrategy.OnPush
})
export class NxMotionDetectionOverlay implements OnChanges, AfterContentChecked {
    @Input() height: number;
    @Input() width: number;
    @Input() initialMask: string;
    @ViewChild('motionCanvas') motionCanvas: ElementRef<HTMLCanvasElement>;

    motionMask: MotionMaskState;
    motionMaskRenderer: MotionMaskRenderer;

    /**
     * Color for sensitivity level is found by its index. Level 3 is sensitivityColors[3].
     */
    sensitivityColors: SensitivityColor[] = [
        '#FFFFFF', '#627CD6', '#23A4CB', '#31BAA2', '#79BC66', '#B8BC37', '#FBA405', '#E97119', '#D24729', '#C22626'
    ];

    ngOnInit() {
        this.initMask();
    }

    ngOnChanges({ initialMask, height, width }: SimpleChanges) {
        const initialMaskChanged = initialMask && !initialMask.isFirstChange() && this.motionMask;
        const heightChanged = height && !height.isFirstChange();
        const widthChanged = width && !width.isFirstChange();
        const changed = initialMaskChanged || heightChanged || widthChanged;
        if (initialMaskChanged) {
            this.motionMask.reInitialize(this.initialMask);
        };

        if (changed && this.motionMaskRenderer && this.motionMaskRenderer.canvas) {
            this.motionMaskRenderer.initCanvas(this.motionCanvas);
        }
    }

    ngAfterContentChecked() {
        const firstRender = !this.motionMaskRenderer && this.motionCanvas && this.motionCanvas.nativeElement;
        if (firstRender) {
            this.initRenderer();
        }
    }

    ngOnDestroy() {}

    // Init methods
    private initMask() {
        this.motionMask = new MotionMaskState(this.initialMask, this.motionCanvas);
    }

    private initRenderer() {
        this.motionMaskRenderer = new MotionMaskRenderer(this.motionMask, this.sensitivityColors);
        this.motionMaskRenderer.initCanvas(this.motionCanvas);
    }
}

export class MotionMaskState {
    public maskMatrix: BehaviorSubject<Mask[]>;
    public maskZones: BehaviorSubject<Area[][]>;
    public selectionZones: BehaviorSubject<Area[]> = new BehaviorSubject([new Area(4, 6, 5, 10, 10, true)]);

    constructor(initialMask: string, public canvas: ElementRef<HTMLCanvasElement>) {
        const parsedInitial = this.initialToMaskZones(initialMask);
        this.maskZones = new BehaviorSubject([parsedInitial]);
        this.maskMatrix = new BehaviorSubject([this.zonesToMatrix(parsedInitial)]);
    }

    // Public methods
    public reInitialize(mask: string) {
        const parsedInitial = this.initialToMaskZones(mask);
        this.maskZones.next([parsedInitial]);
        this.maskMatrix.next([this.zonesToMatrix(parsedInitial)]);
    }

    // Init Methods
    private initialToMaskZones(initial: string): Area[] {
        const zones = initial.split(';').map(area => {
            const areaTuples = <AreaTuple> area.split(',').map(numString => parseInt(numString));
            return new Area(...areaTuples);
        });
        return this.sortedZones(zones);
    }

    private zonesToMatrix(zones: Area[]): Mask {
        let matrix: Mask = new Array(32).fill(new Array(44).fill(0));
        for (const zone of zones) {
            matrix = this.addZone(zone, matrix);
        }
        return matrix;
    }

    // State transform methods
    public mergeZones(currentZones: Area[], selectionZones: Area[]): {maskMatrix: Mask, zones: Area[]} {
        const merged = [...selectionZones]; // this will take a lot of work
        currentZones.forEach(zone => zone.resizeForOverlaps(selectionZones).forEach(newZone => merged.push(newZone)));
        return {
            maskMatrix : this.zonesToMatrix([...currentZones, ...selectionZones]),
            zones      : merged
        };
    }

    public get renderState() {
        return this.mergeZones(this.maskZones.value[this.maskZones.value.length - 1], this.selectionZones.value);
    }

    // Transform utilities
    private addZone(zone: Area, mask: Mask): Mask {
        const maskCopy = [...mask.map(row => [...row])];
        const { sensitivity, x, y, width, height, currentSelection } = zone;
        for (let row = y; row < y + height; row++) {
            for (let column = x; column < x + width; column++) {
                maskCopy[row][column] = currentSelection ? sensitivity + 100 : sensitivity;
            }
        }
        return maskCopy;
    }

    /**
    * Returns zones sorted.
    */
    public sortedZones(zones: Area[]): Area[] {
        return zones.sort((a, b) => a.y - b.y || a.x - b.x);
    }

    /**
    * Returns array representing contiguous areas representing one zone.
    */
    public findZoneGroups = (zones: Area[]): Area[][] => {
        let sorted: Area[] = this.sortedZones(zones);
        const zoneGroups: Area[][] = [];
        while (sorted.length) {
            const [first, ...rest] = sorted;
            let group = [first];
            sorted = rest;
            for (let groupPointer = 0; groupPointer < group.length; groupPointer++) {
                const borderingZones = sorted.filter(zone => zone.borders(group[groupPointer]));
                group = [...group, ...borderingZones];
                sorted = sorted.filter(zone => !zone.borders(group[groupPointer]));
            }
            zoneGroups.push(group);
        }
        return zoneGroups;
    }

    /**
     * Used for placing sensitivity number indicators.
     */
    public findStartZones = (zones: Area[]) => this.findZoneGroups(zones).map(group => group[0]);
}

export class MotionMaskRenderer {
    private cellWidth: number;
    private cellHeight: number;
    private height: number;
    private width: number;
    private columns = 44;
    private rows = 32;
    private ctx: CanvasRenderingContext2D;

    private maskMatrix: BehaviorSubject<Mask[]>;
    private maskZones: BehaviorSubject<Area[][]>;
    private selectionZones: BehaviorSubject<Area[]>;

    public canvas: ElementRef<HTMLCanvasElement>;
    public renderer: Subscription;
    public interactions: Subscription;

    constructor(private motionMask: MotionMaskState,
        private sensitivityColors: SensitivityColor[]
    ) {}

    // Init methods
    public initCanvas = (canvas: ElementRef<HTMLCanvasElement>) => {
        this.cellWidth = canvas.nativeElement.width / this.columns;
        this.cellHeight = canvas.nativeElement.height / this.rows;
        this.width = canvas.nativeElement.width;
        this.height = canvas.nativeElement.height;
        this.ctx = canvas.nativeElement.getContext('2d');
        this.maskMatrix = this.motionMask.maskMatrix;
        this.maskZones = this.motionMask.maskZones;
        this.selectionZones = this.motionMask.selectionZones;
        this.initInteractions(canvas.nativeElement);
        this.renderer = merge(this.maskMatrix, this.maskZones, this.selectionZones)
            .subscribe(() => {
                this.ctx.clearRect(0, 0, this.width, this.height);
                this.render();
            });
    }

    private initInteractions(canvas: HTMLCanvasElement) {
        // Initialize base observables from events
        const track = (eventName: string) => <Observable<MouseEvent>> fromEvent(canvas, eventName);
        const [
            mouseDown, mouseUp, mouseLeave, mouseMove, mouseEnter
        ] = ['mousedown', 'mouseup', 'mouseleave', 'mousemove', 'mouseenter'].map(track);
        const [keyDown, keyUp] = ['keydown', 'keyup'].map(event => <Observable<KeyboardEvent>> fromEvent(window, event));

        // Utility functions
        const findEventCoords = (event: MouseEvent) => {
            const rect = canvas.getBoundingClientRect();
            const cellActualWidth = rect.width / this.columns;
            const cellActualHeight = rect.height / this.rows;

            return {
                x : Math.floor((event.clientX - rect.left) / cellActualWidth),
                y : Math.floor((event.clientY - rect.top) / cellActualHeight)
            };
        };

        // Base observables for managing UI state
        const shiftCtrlState = merge(keyDown, keyUp).pipe(
            filter(({ key }) => key === 'Control' || key === 'Shift'),
            map(({ ctrlKey, shiftKey }) => ({ ctrlKey, shiftKey })),
            distinctUntilChanged((x, y) => x.ctrlKey === y.ctrlKey && x.shiftKey === y.shiftKey)
        );

        const clickState = merge(mouseEnter, mouseDown, mouseUp, mouseLeave).pipe(
            map(({ type }) => type === 'mousedown'),
            distinctUntilChanged()
        );

        const mouseState = mouseMove.pipe(
            throttleTime(100),
            map(findEventCoords),
            distinctUntilChanged(({ x: prevX, y: prevY }, { x, y }) => prevX === x && prevY === y),
            tap(this.drawHover) // For testing, will either remove or move into full UI observable later
        ).subscribe(() => console.log('move'));
    }

    // Render methods
    private fillZones() {
        this.motionMask.renderState.zones.forEach(({ sensitivity, x, y, width, height, currentSelection }) => {
            this.ctx.clearRect(x * this.cellWidth, y * this.cellHeight, width * this.cellWidth, height * this.cellHeight); // can probably remove this for performance once overlap handling is finished
            this.ctx.beginPath();
            this.ctx.fillStyle = currentSelection ? this.sensitivityColors[sensitivity - 100] + 'bb' : this.sensitivityColors[sensitivity] + '55';
            this.ctx.rect(x * this.cellWidth, y * this.cellHeight, width * this.cellWidth, height * this.cellHeight);
            this.ctx.fill();
        });
    }

    private drawCells() {
        const currentMatrix = this.motionMask.renderState.maskMatrix;
        this.ctx.lineWidth = 1;
        currentMatrix.forEach((_, row) => _.forEach(this.drawCell(currentMatrix, row)));
    }

    private drawCell = (maskMatrix: Mask, row: number) => (sensitivity: number, column: number) => {
        const top = row * this.cellHeight - 0.5;
        const bottom = (row + 1) * this.cellHeight + 0.5;
        const left = column * this.cellWidth - 0.5;
        const right = (column + 1) * this.cellWidth + 0.5;
        const drawTop = row && sensitivity !== maskMatrix[row - 1][column];
        const drawRight = column !== this.columns - 1 && sensitivity !== maskMatrix[row][column + 1];
        const drawBottom = row !== this.rows - 1 && sensitivity !== maskMatrix[row + 1][column];
        const drawLeft = column && sensitivity !== maskMatrix[row][column - 1];

        const draw = (fromY, fromX, toY, toX, solid) => {
            this.ctx.strokeStyle = solid ? 'black' : '#FFFFFF1A';
            this.ctx.shadowColor = null;
            this.ctx.shadowBlur = null;
            this.ctx.beginPath();
            this.ctx.moveTo(fromX, fromY);
            this.ctx.lineTo(toX, toY);
            this.ctx.stroke();
        };

        draw(top, left, top, right, drawTop);
        draw(top, right, bottom, right, drawRight);
        draw(bottom, right, bottom, left, drawBottom);
        draw(bottom, left, top, left, drawLeft);
    }

    private addNumbers() {
        const { sortedZones, findStartZones, renderState: { zones } } = this.motionMask;
        const currentMask = sortedZones(zones);
        const startZones = findStartZones(currentMask);
        const fontSize = 30;
        this.ctx.textAlign = 'center';
        this.ctx.font = `${fontSize}px sans-serif`;
        this.ctx.fillStyle = 'white';
        this.ctx.shadowColor = 'black';
        this.ctx.shadowBlur = 6;
        startZones.forEach(({ x, y, width, height, sensitivity }) => {
            const addOffsetX = width >= 2 ? this.cellWidth / 2 : 0;
            const addOffsetY = height >= 2 ? this.cellHeight / 2 : 0;
            this.ctx.fillText(
                `${sensitivity || '0'}`,
                (x + 0.5) * this.cellWidth + addOffsetX,
                (y + 1) * this.cellHeight - 4 + addOffsetY
            );
        });
    }

    private drawHover = (cursor: {x: number, y: number}) => {
        const { x, y, width, height } = {
            x      : cursor.x * this.cellWidth,
            y      : cursor.y * this.cellHeight,
            width  : this.cellWidth,
            height : this.cellHeight
        };
        this.render();
        this.ctx.lineWidth = 1.5;
        this.ctx.strokeStyle = '#2FA2DB';
        this.ctx.strokeRect(x, y, width, height);
    }

    render() {
        this.ctx.clearRect(0, 0, this.width, this.height);
        this.fillZones();
        this.drawCells();
        this.addNumbers();
    }
}
