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
    Inject
} from '@angular/core';
import { DeviceDetectorService } from 'ngx-device-detector';
import { BehaviorSubject, Subject } from 'rxjs';

import { cameraSettings } from '@lib/variables/static-variables';
import { WINDOW } from '@services/window-provider';
import { NgChanges } from '@utils/ng-changes';

import { MotionMaskRenderer } from './MotionMaskRenderer';
import { MotionMaskState } from './MotionMaskState';

@Component({
    selector: 'nx-motion-detection-overlay',
    templateUrl: 'motion-detection-overlay.component.html',
    styleUrls: ['motion-detection-overlay.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush
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

    @Output() updateMask: EventEmitter<string> = new EventEmitter();

    constructor(
        private deviceService: DeviceDetectorService,
        @Inject(WINDOW) private window: Window,
    ) {}

    ngOnInit(): void {
        this.initMask();
    }

    ngOnChanges({ initialMask, height, width }: NgChanges<NxMotionDetectionOverlay>): void {
        const initialMaskChanged = initialMask &&
            !initialMask.isFirstChange() &&
            this.motionMask;
        const heightChanged = height && !height.isFirstChange();
        const widthChanged = width && !width.isFirstChange();
        const changed = initialMaskChanged || heightChanged || widthChanged;
        if (initialMaskChanged) {
            this.motionMask.reInitialize(this.initialMask);
        }

        if (
            changed &&
            this.motionMaskRenderer &&
            this.motionMaskRenderer.canvas
        ) {
            this.motionMaskRenderer.initCanvas(
                this.motionCanvas,
                this.selectionCanvas
            );
        }
    }

    ngAfterContentChecked(): void {
        const firstRender = !this.motionMaskRenderer &&
            this.motionCanvas &&
            this.motionCanvas.nativeElement;
        if (firstRender) {
            this.initRenderer();
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
            this.rotation as number
        );
    }

    /**
     * Renderer has to be initialized after content checked, needs motionCanvas ref.
     */
    private initRenderer(): void {
        this.motionMaskRenderer = new MotionMaskRenderer(
            this.motionMask,
            cameraSettings.sensitivityColors,
            this.unsub$,
            this.sensitivityButtons$,
            this.deviceService.isMobile() || this.deviceService.isTablet(),
            this.window,
        );

        this.motionMaskRenderer.initCanvas(this.motionCanvas, this.selectionCanvas);
    }
}
