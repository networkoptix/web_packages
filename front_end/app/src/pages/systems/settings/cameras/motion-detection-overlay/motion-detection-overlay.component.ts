import { Component, Input, ViewChild, ElementRef, OnChanges, SimpleChanges, AfterContentInit, AfterContentChecked, ChangeDetectionStrategy } from '@angular/core';
import { AutoUnsubscribe } from 'ngx-auto-unsubscribe';
import { BehaviorSubject, Subscription, Observable, merge } from 'rxjs';
import { throttleTime } from 'rxjs/operators';
import { animationFrame } from 'rxjs/internal/scheduler/animationFrame';

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

    sensitivityColors: SensitivityColor[] = [
        // Color for sensitivity level is found by its index. Level 3 is sensitivityColors[3].
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

    ngOnDestroy() {
        // this.motionMaskRenderer.renderer.unsubscribe();
    }

    // Init methods
    private initMask() {
        this.motionMask = new MotionMaskState(this.initialMask, this.motionCanvas, this.sensitivityColors);
    }

    private initRenderer() {
        this.motionMaskRenderer = new MotionMaskRenderer(this.motionMask, this.sensitivityColors);
        this.motionMaskRenderer.initCanvas(this.motionCanvas);
        // this.motionMaskRenderer.initCanvas(this.motionCanvas);
    }
}

export class MotionMaskState {
    public maskMatrix: BehaviorSubject<Mask[]>;
    public maskZones: BehaviorSubject<Area[][]>;

    constructor(initialMask: string,
        public canvas: ElementRef<HTMLCanvasElement>,
        private sensitivityColors: string[]) {
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
        return initial.split(';').map(area => {
            const areaTuples = <AreaTuple> area.split(',').map(numString => parseInt(numString));
            return new Area(...areaTuples);
        });
    }

    private zonesToMatrix(zones: Area[]): Mask {
        let matrix: Mask = new Array(32).fill(new Array(44).fill(0));
        for (const zone of zones) {
            matrix = this.addZone(zone, matrix);
        }
        return matrix;
    }

    // Transform methods
    private addZone(zone: Area, mask: Mask): Mask {
        const maskCopy = [...mask.map(row => [...row])];
        const { sensitivity, x, y, width, height } = zone;
        for (let row = y; row < y + height; row++) {
            for (let column = x; column < x + width; column++) {
                maskCopy[row][column] = sensitivity;
            }
        }
        return maskCopy;
    }

    public groupZones(zones: Area[]) {

    }

    private maskStateEncodeToString(mask: Mask): string {
        return 'wip';
    }
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

    public canvas: ElementRef<HTMLCanvasElement>;
    public renderer: Subscription;

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
        this.renderer = merge(this.maskMatrix, this.maskZones)
            // .pipe(throttleTime(0, animationFrame))
            .subscribe(() => {
                this.render();
            });
    }

    // Render methods
    grid() {
        this.ctx.strokeStyle = '#FFFFFF1A';
        this.ctx.beginPath();
        for (let x = 0; x <= this.width; x += this.cellWidth) {
            this.ctx.moveTo(x, 0.5);
            this.ctx.lineTo(x, this.height + 0.5);
        }
        for (let y = 0; y <= this.height; y += this.cellHeight) {
            this.ctx.moveTo(0, y + 0.5);
            this.ctx.lineTo(this.width, y + 0.5);
        }
        this.ctx.stroke();
    }

    fillZones() {
        const zonesState = this.maskZones.value;
        const currentState = zonesState[zonesState.length - 1];
        currentState.forEach(({ sensitivity, x, y, width, height }) => {
            this.ctx.beginPath();
            this.ctx.fillStyle = this.sensitivityColors[sensitivity] + '1A';
            this.ctx.rect(x * this.cellWidth, y * this.cellHeight, width * this.cellWidth, height * this.cellHeight);
            this.ctx.fill();
        });
    }

    drawCells() {
        const maskMatrix = this.maskMatrix.value;
        const currentMatrix = maskMatrix[maskMatrix.length - 1];
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

        this.ctx.strokeStyle = 'black';

        const draw = (fromY, fromX, toY, toX) => {
            this.ctx.beginPath();
            this.ctx.moveTo(fromX, fromY);
            this.ctx.lineTo(toX, toY);
            this.ctx.stroke();
        };

        if (drawTop) draw(top, left, top, right);
        if (drawRight) draw(top, right, bottom, right);
        if (drawBottom) draw(bottom, right, bottom, left);
        if (drawLeft) draw(bottom, left, top, left);
    }

    render() {
        this.fillZones();
        this.grid();
        this.drawCells();
    }
}

export type SensitivityColor = '#FFFFFF'| '#627CD6'| '#23A4CB'| '#31BAA2'| '#79BC66'| '#B8BC37'| '#FBA405'| '#E97119'| '#D24729'| '#C22626';
export type Cell = number;
export type Row = Cell[];
export type Mask = Row[];

export type AreaTuple = [number, number, number, number, number]

export class Area {
    constructor(
        public sensitivity: number,
        public x: number,
        public y: number,
        public width: number,
        public height: number,
        public currentSelection?: boolean
    ) {}
}
