import { Component, Input, ViewChild, ElementRef, OnChanges, SimpleChanges } from '@angular/core';
import { AutoUnsubscribe } from 'ngx-auto-unsubscribe';
import { BehaviorSubject } from 'rxjs';

@AutoUnsubscribe()
@Component({
    selector    : 'nx-motion-detection-overlay',
    templateUrl : 'motion-detection-overlay.component.html',
    styleUrls   : ['motion-detection-overlay.component.scss']
})
export class NxMotionDetectionOverlay implements OnChanges {
    @Input() height: number;
    @Input() width: number;
    @Input() initialMask: string;
    @ViewChild('motionCanvas') motionCanvas: ElementRef<HTMLCanvasElement>;

    motionMask: MotionCanvas;

    sensitivityColors = [
        // Color for sensitivity level is found by its index. Level 3 is sensitivityColors[3].
        '#FFFFFF', '#627CD6', '#23A4CB', '#31BAA2', '#79BC66', '#B8BC37', '#FBA405', '#E97119', '#D24729', '#C22626'
    ];

    ngOnInit() {
    }

    ngOnChanges({ initialMask: { currentValue, previousValue } }: SimpleChanges) {
        if (currentValue !== previousValue) this.initMask();
    }

    ngOnDestroy() {}

    initMask() {
        this.motionMask = new MotionCanvas(this.initialMask, this.motionCanvas, this.sensitivityColors);
    }
}

export class MotionCanvas {
    maskState: BehaviorSubject<Mask[]>;
    maskZones: BehaviorSubject<Area[][]>;

    constructor(initialMask: string,
        private canvas: ElementRef<HTMLCanvasElement>,
        private sensitivityColors: string[]) {
        const defaultMask = '5,0,0,44,32';
        const parsedInitial = this.initialToMaskZones(initialMask || defaultMask);
        this.maskZones = new BehaviorSubject([parsedInitial]);
        this.maskState = new BehaviorSubject([this.zonesToState(parsedInitial)]);
        console.log(JSON.stringify(this.maskZones.value, null, 2));
    }

    private initialToMaskZones(initial: string): Area[] {
        return initial.split(';').map(area => {
            const areaTuples = <AreaTuple> area.split(',').map(numString => parseInt(numString));
            return new Area(...areaTuples);
        });
    }

    private zonesToState(zones: Area[]): Mask {
        return [[1]];
    }

    private maskStateEncodeToString(mask: Mask): string {
        return 'wip';
    }
}

export type Mask = number[][];

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
