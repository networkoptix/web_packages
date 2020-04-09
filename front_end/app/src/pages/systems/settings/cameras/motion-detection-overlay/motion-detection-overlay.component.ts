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
    private columns = 44;
    private rows = 32;
    public maskMatrix: BehaviorSubject<Mask[]>;
    public maskZones: BehaviorSubject<Area[][]>;

    constructor(initialMask: string,
        public canvas: ElementRef<HTMLCanvasElement>,
        private sensitivityColors: string[]) {
        const parsedInitial = this.initialToMaskZones(initialMask);
        console.log(this.groupZones(parsedInitial).length);
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

    /**
    * Returns zones sorted from top left to bottom right.
    */
    private sortedZones(zones: Area[]): Area[] {
        return zones.sort((a, b) => a.y - b.y || a.x - b.x);
    }

    /**
    * Returns nested array with each inner array containing indexes of contigious zones.
    *
    * Each inner array sorted from top left to bottom right.
    */
    public groupZones = (zones: Area[]): number[][] => {
        enum Positions {
            RIGHT = 'right',
            BOTTOM = 'bottom',
            LEFT = 'left'
        }

        const sorted = this.sortedZones(zones);
        const visitedNodeIndexes: number[] = [];
        const groupedNodes: number[][] = [];

        const findNodeIndex = (position: Positions, { x: zoneStartX, y: zoneStartY, width, height, sensitivity }: Area): number => {
            const zoneEndX = zoneStartX + width;
            const zoneEndY = zoneStartY + height;
            const bounding = { startX: null, startY: null, endX: null, endY: null, sensitivity };

            if (position === Positions.RIGHT) {
                if (zoneEndX === this.columns - 1) return -1;
                bounding.startX = bounding.endX = zoneEndX + 1;
                bounding.startY = zoneStartY;
                bounding.endY = zoneEndY;
            }

            if (position === Positions.LEFT) {
                if (zoneStartX === 0) return -1;
                bounding.startX = bounding.endX = zoneStartX - 1;
                bounding.startY = zoneStartY;
                bounding.endY = zoneEndY;
            }

            if (position === Positions.BOTTOM) {
                if (zoneEndY === this.rows - 1) return -1;
                bounding.startY = bounding.endY = zoneEndY + 1;
                bounding.startX = zoneStartX;
                bounding.endX = zoneEndX;
            }

            const byOverlap = ({ x: startX, y: startY, width, height, sensitivity }: Area): boolean => {
                if (bounding.sensitivity !== sensitivity) return false;

                const endX = startX + width;
                const endY = startY + height;
                const overlapX = bounding.endX < startX || bounding.startX > endX;
                const overlapY = bounding.endY < startY || bounding.startY > endY;

                return overlapX && overlapY;
            };

            return sorted.findIndex(byOverlap);
        };

        const traverseNode = (node: Area, index: number, group = []): number[] => {
            if (index in visitedNodeIndexes || index in group) {
                return;
            }

            const rightNodeIndex = findNodeIndex(Positions.RIGHT, node);
            const leftNodeIndex = findNodeIndex(Positions.LEFT, node);
            const bottomNodeIndex = findNodeIndex(Positions.BOTTOM, node);

            // Add node to current group, mark as visited, then traverse contiguous nodes
            visitedNodeIndexes.push(index);
            group.push(index);
            if (rightNodeIndex !== -1) traverseNode(sorted[rightNodeIndex], rightNodeIndex, group);
            if (leftNodeIndex !== -1) traverseNode(sorted[leftNodeIndex], leftNodeIndex, group);
            if (bottomNodeIndex !== -1) traverseNode(sorted[bottomNodeIndex], bottomNodeIndex, group);

            return group;
        };

        sorted.forEach((node, index) => {
            const group = traverseNode(node, index);
            if (group) groupedNodes.push(group);
        });

        return groupedNodes;
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

        const draw = (fromY, fromX, toY, toX, solid) => {
            this.ctx.strokeStyle = solid ? 'black' : '#FFFFFF1A';
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

    render() {
        this.fillZones();
        // this.grid();
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
