import { Component, Input, ViewChild, ElementRef, OnChanges, SimpleChanges, AfterContentInit, AfterContentChecked } from '@angular/core';
import { AutoUnsubscribe } from 'ngx-auto-unsubscribe';
import { BehaviorSubject, Subscription, Observable, merge } from 'rxjs';
import { throttleTime } from 'rxjs/operators';
import { animationFrame } from 'rxjs/internal/scheduler/animationFrame';

@AutoUnsubscribe()
@Component({
    selector    : 'nx-motion-detection-overlay',
    templateUrl : 'motion-detection-overlay.component.html',
    styleUrls   : ['motion-detection-overlay.component.scss']
})
export class NxMotionDetectionOverlay implements OnChanges, AfterContentChecked {
    @Input() height: number;
    @Input() width: number;
    @Input() initialMask: string;
    @ViewChild('motionCanvas') motionCanvas: ElementRef<HTMLCanvasElement>;

    motionMask: MotionMaskState;
    motionMaskRenderer: MotionMaskRenderer

    sensitivityColors: SensitivityColor[] = [
        // Color for sensitivity level is found by its index. Level 3 is sensitivityColors[3].
        '#FFFFFF', '#627CD6', '#23A4CB', '#31BAA2', '#79BC66', '#B8BC37', '#FBA405', '#E97119', '#D24729', '#C22626'
    ];

    ngOnInit() {
        this.initMask();
    }

    ngOnChanges({ initialMask: { currentValue, previousValue } }: SimpleChanges) {
        if (currentValue !== previousValue && this.motionMask) {
            this.motionMask.reInitialize(this.initialMask);
        };
    }

    ngAfterContentChecked() {
        if (!this.motionMaskRenderer && this.motionCanvas && this.motionCanvas.nativeElement) {
            this.initRenderer();
        }
    }

    ngOnDestroy() {}

    // Init methods
    private initMask() {
        this.motionMask = new MotionMaskState(this.initialMask, this.motionCanvas, this.sensitivityColors);
    }

    private initRenderer() {
        this.motionMaskRenderer = new MotionMaskRenderer(this.motionMask, this.motionCanvas, this.sensitivityColors);
    }
}

export class MotionMaskState {
    public maskMatrix: BehaviorSubject<Mask[]>;
    public maskZones: BehaviorSubject<Area[][]>;

    constructor(initialMask: string,
        private canvas: ElementRef<HTMLCanvasElement>,
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

    private maskStateEncodeToString(mask: Mask): string {
        return 'wip';
    }
}

export class MotionMaskRenderer {
    cellWidth: number;
    cellHeight: number;
    columns = 44;
    rows = 32;

    maskMatrix: Observable<Mask[]>;
    maskZones: Observable<Area[][]>;

    renderer: Subscription;

    constructor(private motionMask: MotionMaskState,
        private canvas: ElementRef<HTMLCanvasElement>,
        private sensitivityColors: SensitivityColor[]
    ) {
        this.cellWidth = this.canvas.nativeElement.width / this.columns;
        this.cellHeight = this.canvas.nativeElement.height / this.rows;
        this.maskMatrix = this.motionMask.maskMatrix;
        this.maskZones = this.motionMask.maskZones;
        this.renderer = merge(this.maskMatrix, this.maskZones)
            .pipe(throttleTime(0, animationFrame))
            .subscribe(() => {
                console.log('updated');
            });
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
