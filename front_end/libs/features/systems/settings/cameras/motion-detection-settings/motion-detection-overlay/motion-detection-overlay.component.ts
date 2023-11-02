import {
    Component,
    Input,
    ViewChild,
    ElementRef,
    OnChanges,
    AfterContentChecked,
    ChangeDetectionStrategy,
    HostListener,
    Output,
    EventEmitter,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DeviceDetectorService } from 'ngx-device-detector';
import { BehaviorSubject, Subject, take } from 'rxjs';

import { NgChanges } from '@utils/ng-changes';

import { MotionMaskRenderer } from './MotionMaskRenderer';
import { MotionMaskState } from './MotionMaskState';

@Component({
    selector: 'nx-motion-detection-overlay',
    templateUrl: 'motion-detection-overlay.component.html',
    styleUrls: ['motion-detection-overlay.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NxMotionDetectionOverlay implements OnChanges, AfterContentChecked {
    @Input() height: number;
    @Input() width: number;
    @Input() initialMask: string;
    @Input() rotation: number | string = 0;
    @Input() sensitivityButtons$: BehaviorSubject<number | boolean | 'reset'>;
    @ViewChild('motionCanvas') motionCanvas: ElementRef<HTMLCanvasElement>;
    @ViewChild('selectionCanvas') selectionCanvas: ElementRef<HTMLCanvasElement>;
    @HostListener('contextmenu', ['$event'])
    preventContext = (event: Event): void => event.preventDefault();
    unsub$: Subject<boolean> = new Subject();
    motionMask: MotionMaskState;
    motionMaskRenderer: MotionMaskRenderer;
    readonly cameraSettings = {
        sensitivityColors: [
            '#FFFFFF',
            '#627CD6',
            '#23A4CB',
            '#31BAA2',
            '#79BC66',
            '#B8BC37',
            '#FBA405',
            '#E97119',
            '#D24729',
            '#C22626',
        ],
    };

    @Output() updateMask: EventEmitter<string> = new EventEmitter();

    constructor(private deviceService: DeviceDetectorService) {
        this.firstCanvasSubject.pipe(take(1), takeUntilDestroyed()).subscribe(() => {
            setTimeout(() => {
                this.initRenderer();
            });
        });
    }

    ngOnInit(): void {
        this.initMask();
    }

    ngOnChanges({ initialMask, height, width }: NgChanges<NxMotionDetectionOverlay>): void {
        const initialMaskChanged = initialMask && !initialMask.isFirstChange() && this.motionMask;
        const heightChanged = height && !height.isFirstChange();
        const widthChanged = width && !width.isFirstChange();
        const changed = initialMaskChanged || heightChanged || widthChanged;
        if (initialMaskChanged) {
            this.motionMask.reInitialize(this.initialMask);
        }

        if (changed && this.motionMaskRenderer && this.motionMaskRenderer.canvas) {
            this.motionMaskRenderer.initCanvas(this.motionCanvas, this.selectionCanvas);
        }
    }

    // TODO: Investigate how to avoid this first render only call
    firstCanvasSubject = new Subject<number>();
    ngAfterContentChecked(): void {
        const firstRender =
            !this.motionMaskRenderer && this.motionCanvas && this.motionCanvas.nativeElement;
        if (firstRender) {
            this.firstCanvasSubject.next(1);
        }
    }

    ngOnDestroy(): void {
        this.unsub$.next(true);
    }

    // Init methods
    private initMask(): void {
        this.motionMask = new MotionMaskState(
            this.initialMask,
            this.motionCanvas,
            this.sensitivityButtons$,
            this.unsub$,
            this.updateMask,
            this.rotation as number,
        );
    }

    /**
     * Renderer has to be initialized after content checked, needs motionCanvas ref.
     */
    private initRenderer(): void {
        this.motionMaskRenderer = new MotionMaskRenderer(
            this.motionMask,
            this.cameraSettings.sensitivityColors,
            this.unsub$,
            this.sensitivityButtons$,
            this.deviceService.isMobile() || this.deviceService.isTablet(),
        );

        this.motionMaskRenderer.initCanvas(this.motionCanvas, this.selectionCanvas);
    }
}
