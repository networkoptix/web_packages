import {
    Component, Input, ViewChild, ElementRef, OnChanges, SimpleChanges, AfterContentChecked, ChangeDetectionStrategy
}                           from '@angular/core';
import { AutoUnsubscribe }  from 'ngx-auto-unsubscribe';
import {
    BehaviorSubject, Subscription, merge, fromEvent, Observable
}                           from 'rxjs';
import { takeUntil, switchMap, pairwise, throttle, throttleTime, filter, distinctUntilChanged, map, startWith, tap, buffer, debounceTime, withLatestFrom } from 'rxjs/operators';
import { animationFrame } from 'rxjs/internal/scheduler/animationFrame';
import { SensitivityColor, Mask, Area, AreaTuple, SelectionAction } from './motion-detection-types';

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
    private columns = 44;
    private rows = 32;

    public maskMatrix: BehaviorSubject<Mask[]>;
    public maskZones: BehaviorSubject<Area[][]>;
    public selectionZones: BehaviorSubject<Area[]> = new BehaviorSubject([]);
    public renderState$: BehaviorSubject<{zones: Area[], maskMatrix: Mask}> = new BehaviorSubject({ zones: [], maskMatrix: [] });
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

    // State transform methods
    public mergeZones(currentZones: Area[], selectionZones: Area[]): {maskMatrix: Mask, zones: Area[]} {
        const maskMatrix = this.zonesToMatrix([...currentZones, ...selectionZones]);
        const zones = this.matrixToZones(maskMatrix);
        return { maskMatrix, zones };
    }

    updateRenderState() {
        this.renderState$.next(this.mergeZones(this.maskZones.value[this.maskZones.value.length - 1], this.selectionZones.value));
    }

    get renderState() {
        return this.renderState$.value;
    }

    // Transform utilities
    private zonesToMatrix(zones: Area[]): Mask {
        let matrix: Mask = new Array(32).fill(new Array(44).fill(0));
        for (const zone of zones) {
            matrix = this.addZone(zone, matrix);
        }
        return matrix;
    }

    private matrixToZones(maskMatrix: number[][]): Area[] {
        const matrix = <(number | false)[][]> [...maskMatrix].map(row => [...row]);
        const zones: Area[] = [];

        const updateZones = (row: number, column: number, sensitivity) => {
            let width = 1;
            let height = 1;

            while ((column + width) < this.columns && matrix[row][column + width] === sensitivity) {
                // find width
                matrix[row][column + width] = false;
                width++;
            };

            while ((row + height) < this.rows &&
                matrix[row + height].slice(column, column + width).every(cell => cell !== false &&
                cell === sensitivity)) {
                // find height
                for (let x = column; x < column + width; x++) {
                    matrix[row + height][x] = false;
                }
                height++;
            }

            zones.push(new Area(sensitivity, column, row, width, height, sensitivity >= 100));
        };

        matrix.forEach((_, row) => {
            _.forEach((_, column) => {
                if (matrix[row][column] !== false) {
                    updateZones(row, column, maskMatrix[row][column]);
                }
            });
        });
        return zones;
    }

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
                this.motionMask.updateRenderState();
                this.render();
            });
    }

    private initInteractions(canvas: HTMLCanvasElement) {
        // Initialize base observables from events
        const track = (eventName: string) => <Observable<MouseEvent>> fromEvent(canvas, eventName);
        const [
            mouseDown$, mouseUp$, mouseLeave$, mouseMove$
        ] = ['mousedown', 'mouseup', 'mouseleave', 'mousemove'].map(track);
        const [keyDown$, keyUp$] = ['keydown', 'keyup'].map(event => <Observable<KeyboardEvent>> fromEvent(window, event));

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
        const shiftCtrlSubject$ = new BehaviorSubject({ ctrlKey: false, shiftKey: false });
        const shiftCtrlState$ = merge(keyDown$, keyUp$).pipe(
            filter(({ key }) => key === 'Control' || key === 'Shift'),
            map(({ ctrlKey, shiftKey }) => ({ ctrlKey, shiftKey })),
            distinctUntilChanged((x, y) => x.ctrlKey === y.ctrlKey && x.shiftKey === y.shiftKey)
        ).subscribe(shiftCtrlSubject$);

        const mouseState$ = mouseMove$.pipe(
            throttleTime(100),
            map(findEventCoords),
            distinctUntilChanged(({ x: prevX, y: prevY }, { x, y }) => prevX === x && prevY === y)
            // tap(({ x, y }) => this.drawHoverOrSelection({ x, y, height: 1, width: 1 }))
        ); // For testing, will either remove or move into full UI observable later

        const clickAction$ = merge(mouseDown$, mouseUp$, mouseLeave$);
        const clickBuffer$ = clickAction$.pipe(debounceTime(100));

        const selectionState$ = new BehaviorSubject({ ctrlKey: false, shiftKey: false });

        let selectionRenderSubscription: Subscription;

        const clickState$ = clickAction$.pipe(
            startWith({ type: null }),
            buffer(clickBuffer$),
            withLatestFrom(mouseState$),
            map(([buffer, { x, y }]) => {
                const action: SelectionAction = buffer.length === 4
                    ? 'double-click' : buffer.length === 2
                        ? 'click' : buffer[0].type === 'mousedown'
                            ? 'select-start' : 'select-end';
                return { action, x, y, ...shiftCtrlSubject$.value };
            }),
            pairwise(),
            filter(([prev, cur]) => !(prev.action === 'select-end' && cur.action === 'select-end')),
            map(([prev, { action, x: curX, y: curY, ...keyStates }]) => {
                let width = 1;
                let height = 1;
                const x = Math.min(curX, prev.x);
                const y = Math.min(curY, prev.y);

                if (action === 'select-end') {
                    width = Math.max(curX, prev.x) - Math.min(curX, prev.x) + 1;
                    height = Math.max(curY, prev.y) - Math.min(curY, prev.y) + 1;
                }

                return { action, x, y, width, height, ...keyStates };
            }),
            tap(({ action, x: selectX, y: selectY, ctrlKey, shiftKey, width, height }) => {
                if (selectionRenderSubscription && !selectionRenderSubscription.closed) {
                    selectionRenderSubscription.unsubscribe();
                }

                const [currentZones, ...rest] = this.maskZones.value.reverse();
                const prevSelections = this.selectionZones.value;
                const newZone = new Area(shiftKey ? 9 : Math.round(Math.random() * 9), selectX, selectY, width, height, true);

                if (action === 'select-start') {
                    // start new observable for updating selection rect
                    // selectionRenderSubscription = mouseState$.subscribe(({ x: mouseX, y: mouseY }) => {
                    //     const x = Math.min(selectX, mouseX);
                    //     const y = Math.min(selectY, mouseY);
                    //     width = Math.max(selectX, mouseX) - x + 1;
                    //     height = Math.max(selectY, mouseY) - y + 1;

                    //     this.drawHoverOrSelection({ x, y, height, width });
                    // });
                } else if (action === 'select-end') {
                    if (ctrlKey || shiftKey) {
                        this.selectionZones.next([...prevSelections, newZone]);
                    } else {
                        this.maskZones.next([...rest, [...currentZones, ...prevSelections.map(area => {
                            area.currentSelection = false;
                            return area;
                        }
                        )]]);
                        this.selectionZones.next([newZone]);
                    }
                } else if (action === 'double-click') {
                    console.log('double-click');
                } else {
                    this.render();
                }
            })
        ).subscribe(({ ctrlKey, shiftKey, x, y, width, height, action }) => {
            // const prevZones = ctrlKey || shiftKey ? this.selectionZones.value : [];
            // const newZone = new Area(4, x, y, width, height, true);
            // if (action === 'click' || action === 'select-end') {
            //     this.selectionZones.next([...prevZones, newZone]);
            //     selectionRenderSubscription.unsubscribe();
            // }
        });
    };

    // Render methods
    private fillZones() {
        this.motionMask.renderState.zones.forEach(({ sensitivity, x, y, width, height, currentSelection }) => {
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

        const draw = (fromY, fromX, toY, toX, solid, selected = false) => {
            this.ctx.strokeStyle = solid ? selected ? '#2FA2DB' : 'black' : '#FFFFFF1A';
            this.ctx.shadowColor = null;
            this.ctx.shadowBlur = null;
            this.ctx.beginPath();
            this.ctx.moveTo(fromX, fromY);
            this.ctx.lineTo(toX, toY);
            this.ctx.stroke();
        };

        draw(top, left, top, right, drawTop, sensitivity >= 100);
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

    private drawHoverOrSelection = (cursor: {x: number, y: number, width: number, height: number}) => {
        const { x, y, width, height } = {
            x      : cursor.x * this.cellWidth,
            y      : cursor.y * this.cellHeight,
            width  : cursor.width * this.cellWidth,
            height : cursor.height * this.cellHeight
        };
        this.render();
        this.ctx.lineWidth = 1.5;
        this.ctx.strokeStyle = '#2FA2DB';
        this.ctx.strokeRect(x, y, width, height);
    }

    render() {
        this.ctx.clearRect(0, 0, this.width, this.height);
        this.fillZones();
        this.addNumbers();
        this.drawCells();
    }
}
