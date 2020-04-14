import {
    Component, Input, ViewChild, ElementRef, OnChanges, SimpleChanges, AfterContentChecked, ChangeDetectionStrategy, HostListener
}                           from '@angular/core';
import { AutoUnsubscribe }  from 'ngx-auto-unsubscribe';
import {
    BehaviorSubject, Subscription, merge, fromEvent, Observable
}                           from 'rxjs';
import { 
    switchMap, pairwise, throttleTime, filter, distinctUntilChanged, map, startWith, tap, buffer, debounceTime, withLatestFrom 
}                           from 'rxjs/operators';
import { animationFrame }   from 'rxjs/internal/scheduler/animationFrame';
import { 
    SensitivityColor, Mask, Area, AreaTuple
}                           from './motion-detection-types';

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
    @Input() sensitivityButtons$: BehaviorSubject<number | boolean | 'reset'>;
    @ViewChild('motionCanvas') motionCanvas: ElementRef<HTMLCanvasElement>;
    @HostListener('contextmenu', ['$event']) preventContext = event => event.preventDefault();

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
        this.motionMask = new MotionMaskState(this.initialMask, this.motionCanvas, this.sensitivityButtons$);
    }

    /**
     * Renderer has to be initialized after content checked, needs motionCanvas ref.
     */
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
    constructor(
        initialMask: string,
        public canvas: ElementRef<HTMLCanvasElement>,
        public sensitivityButtons$: BehaviorSubject<boolean | number | 'reset'>
    ) {
        const parsedInitial = this.initialToMaskZones(initialMask);
        this.maskZones = new BehaviorSubject([parsedInitial]);
        this.maskMatrix = new BehaviorSubject([this.zonesToMatrix(parsedInitial)]);
        this.initSensitivityButtons();
    }

    /**
     * Call this method to update mask on route changes.
     * @param mask initial mask from server
     */
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

    initSensitivityButtons = () => {
        this.selectionZones.subscribe((zones) => {
            if (zones.length && this.sensitivityButtons$.value === false) {
                this.sensitivityButtons$.next(!!zones.length);
            }
        });

        this.sensitivityButtons$.subscribe(sensitivity => {
            const selection = this.selectionZones.value;
            if (typeof sensitivity === 'number') {
                const updatedZones = selection.map(area => {
                    area.sensitivity = sensitivity;
                    area.currentSelection = false;
                    return area;
                });
                const [currentZones, ...prevZones] = this.maskZones.value.reverse();
                this.maskZones.next([...prevZones, [...currentZones, ...updatedZones]]);
                this.selectionZones.next([]);
                this.sensitivityButtons$.next(false);
            } else if (sensitivity === 'reset') {
                this.selectionZones.next([]);
                this.sensitivityButtons$.next(false);
            }
        });
    }

    // State transform methods
    public mergeZones(currentZones: Area[], selectionZones: Area[]): {maskMatrix: Mask, zones: Area[]} {
        const maskMatrix = this.zonesToMatrix([...currentZones, ...selectionZones]);
        const zones = this.matrixToZones(maskMatrix);
        return { maskMatrix, zones };
    }

    /**
     * Currently used to trigger first render. Could probably refactor this in the future.
     */
    public updateRenderState() {
        this.renderState$.next(this.mergeZones(this.maskZones.value[this.maskZones.value.length - 1], this.selectionZones.value));
    }

    public get renderState() {
        return this.renderState$.value;
    }

    // Transform utilities
    public zonesToMatrix(zones: Area[]): Mask {
        let matrix: Mask = new Array(32).fill(new Array(44).fill(0));
        for (const zone of zones) {
            matrix = this.addZone(zone, matrix);
        }
        return matrix;
    }

    public matrixToZones(maskMatrix: number[][]): Area[] {
        const matrix = <(number | false)[][]> [...maskMatrix].map(row => [...row]);
        const zones: Area[] = [];

        const updateZones = (row: number, column: number, sensitivity) => {
            let width = 1;
            let height = 1;

            while ((column + width) < this.columns && matrix[row][column + width] === sensitivity) {
                // Find row with matching sensitivity
                matrix[row][column + width] = false;
                width++;
            };

            while ((row + height) < this.rows &&
                matrix[row + height].slice(column, column + width).every(cell => cell !== false &&
                cell === sensitivity)) {
                // Find height where sensitivity still matches for all cells
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

    public addZone(zone: Area, mask: Mask, toggle = false): Mask {
        const maskCopy = [...mask.map(row => [...row])];
        const { sensitivity, x, y, width, height, currentSelection } = zone;
        for (let row = y; row < y + height; row++) {
            for (let column = x; column < x + width; column++) {
                if (toggle) {
                    maskCopy[row][column] = maskCopy[row][column] >= 150 ? 0 : 150;
                } else {
                    maskCopy[row][column] = currentSelection ? Math.min(sensitivity + 100, 150) : sensitivity;
                }
            }
        }
        return maskCopy;
    }

    /**
    * Returns zones sorted top left to bottom right
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

    public get zoneGroups() {
        const current = this.maskZones.value.pop();
        return this.findZoneGroups(current);
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
            mouseDown$, mouseUp$, mouseLeave$, mouseMove$, mouseClick$
        ] = ['mousedown', 'mouseup', 'mouseleave', 'mousemove', 'click'].map(track);
        const [keyDown$, keyUp$] = ['keydown', 'keyup'].map(event => <Observable<KeyboardEvent>> fromEvent(window, event));

        // Utility functions
        const findEventCoords = (event: MouseEvent) => {
            const rect = canvas.getBoundingClientRect();
            const cellActualWidth = rect.width / this.columns;
            const cellActualHeight = rect.height / this.rows;

            return {
                x : Math.floor(((event.clientX) - rect.left) / cellActualWidth),
                y : Math.floor((event.clientY - rect.top) / cellActualHeight)
            };
        };

        const getAction = (buffer: any[]) => {
            buffer = buffer.filter(({ type }) => type !== null);
            const firstClick = buffer.length >= 2 && buffer[0].type === 'mousedown' && buffer[1].type === 'mouseup';
            const doubleClick = buffer.length >= 4 &&
                firstClick &&
                buffer[2].type === 'mousedown' &&
                buffer[3].type === 'mouseup';

            const click = firstClick;
            const start = buffer[0].type === 'mousedown';

            if (doubleClick) return 'double-click';
            if (click) return 'click';
            if (start) return 'select-start';
            return 'select-end';
        };

        // Base observables for managing UI state
        const shiftCtrlSubject$ = new BehaviorSubject({ ctrlKey: false, shiftKey: false });
        const shiftCtrlState$ = merge(keyDown$, keyUp$).pipe(
            filter(({ key }) => key === 'Control' || key === 'Shift'),
            map(({ ctrlKey, shiftKey }) => ({ ctrlKey, shiftKey })),
            distinctUntilChanged((x, y) => x.ctrlKey === y.ctrlKey && x.shiftKey === y.shiftKey)
        ).subscribe(shiftCtrlSubject$);

        const mouseState$ = mouseMove$.pipe(
            throttleTime(0, animationFrame),
            map(findEventCoords),
            distinctUntilChanged(({ x: prevX, y: prevY }, { x, y }) => prevX === x && prevY === y)
        ); // For testing, will either remove or move into full UI observable later

        const clickAction$ = merge(mouseDown$, mouseUp$, mouseLeave$);
        const clickBuffer$ = clickAction$.pipe(debounceTime(50));
        clickAction$.pipe(
            startWith({ type: null, x: 0, y: 0 }),
            buffer(clickBuffer$),
            withLatestFrom(mouseState$.pipe(startWith({ x: 0, y: 0 }))),
            map(([buffer, { x, y }]) => ({ action: getAction(buffer), x, y, ...shiftCtrlSubject$.value })),
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

                return { action, x, y, selectX: curX, selectY: curY, width, height, ...keyStates };
            }),
            switchMap(({ action, x, y, selectX, selectY, ctrlKey, shiftKey, width, height }) => {
                const [currentZones, ...rest] = this.maskZones.value.reverse();
                const prevSelections = this.selectionZones.value;
                const newZone = new Area(150, x, y, width, height, true);

                if (action === 'select-start') {
                    return mouseState$.pipe(
                        tap(({ x: mouseX, y: mouseY }) => {
                            const x = Math.min(selectX, mouseX);
                            const y = Math.min(selectY, mouseY);
                            width = Math.max(selectX, mouseX) - x + 1;
                            height = Math.max(selectY, mouseY) - y + 1;

                            this.drawHoverOrSelection({ x, y, height, width });
                        }));
                } else if (action === 'select-end') {
                    if (shiftKey) {
                        this.selectionZones.next([...prevSelections, newZone]);
                    } else if (ctrlKey) {
                        const matrix = this.motionMask.zonesToMatrix(prevSelections);
                        const updatedMatrix = this.motionMask.addZone(newZone, matrix, true);
                        const updatedZones = this.motionMask.matrixToZones(updatedMatrix)
                            .filter(({ sensitivity }) => sensitivity >= 150);

                        this.selectionZones.next(updatedZones);
                    } else {
                        this.selectionZones.next([]);
                        this.maskZones.next([...rest, [...currentZones, ...prevSelections].filter(
                            ({ sensitivity }) => sensitivity !== 150
                        ).map(area => {
                            area.currentSelection = false;
                            return area;
                        })]);
                        this.selectionZones.next([newZone]);
                    }
                }
                return mouseState$.pipe(
                    tap(({ x, y }) => this.drawHoverOrSelection({ x, y, height: 1, width: 1 })));
            })
        ).subscribe();
    };

    // Render methods

    /**
     * Adds fill color for each cell
     */
    private fillZones() {
        this.motionMask.renderState$.value.zones.forEach(({ sensitivity, x, y, width, height, currentSelection }) => {
            this.ctx.beginPath();
            this.ctx.fillStyle = sensitivity >= 150 ? '#33333377' : this.sensitivityColors[sensitivity] + '55';
            this.ctx.rect(x * this.cellWidth, y * this.cellHeight, width * this.cellWidth, height * this.cellHeight);
            this.ctx.fill();
        });
    }

    /**
     * Iterates through cells and draws outline for each
     */
    private drawCells() {
        const currentMatrix = this.motionMask.renderState.maskMatrix;
        this.ctx.lineWidth = 1;
        currentMatrix.forEach((_, row) => _.forEach(this.drawCell(currentMatrix, row)));
    }

    /**
     * Draw cell borders, black for zone edges, brand color for selection edges, light gray for grid.
     */
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

    /**
     * Add numbers to the top left most cell in a zone
     */
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
            if (sensitivity >= 150) return;
            const addOffsetX = width >= 2 ? this.cellWidth / 2 : 0;
            const addOffsetY = height >= 2 ? this.cellHeight / 2 : 0;
            this.ctx.fillText(
                `${sensitivity || '0'}`,
                (x + 0.5) * this.cellWidth + addOffsetX,
                (y + 1) * this.cellHeight - 4 + addOffsetY
            );
        });
    }

    /**
     * Hover and selection outline
     */
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

    /**
     * Triggered on each state change
     */
    private render() {
        this.ctx.clearRect(0, 0, this.width, this.height);
        this.fillZones();
        this.addNumbers();
        this.drawCells();
    }
}
