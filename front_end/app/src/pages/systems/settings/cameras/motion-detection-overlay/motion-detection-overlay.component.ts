import {
    Component, Input, ViewChild, ElementRef, OnChanges, SimpleChanges, AfterContentChecked, ChangeDetectionStrategy, HostListener
}                               from '@angular/core';
import { AutoUnsubscribe }      from 'ngx-auto-unsubscribe';
import { BehaviorSubject }      from 'rxjs';
import { SensitivityColor }     from './motion-detection-types';
import { MotionMaskState }      from './MotionMaskState';
import { MotionMaskRenderer }   from './MotionMaskRenderer';

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
