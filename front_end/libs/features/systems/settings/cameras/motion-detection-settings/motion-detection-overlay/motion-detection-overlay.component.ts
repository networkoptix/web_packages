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
    Inject,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DeviceDetectorService } from 'ngx-device-detector';
import { BehaviorSubject, Subject, take } from 'rxjs';

import { CameraSettings } from '@services/nx-config/base-config';
import { WINDOW } from '@services/window-provider';
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
    @Input() motionMaskString: string | undefined;
    @Output() motionMaskStringChange = new EventEmitter<string>();
    @Input() rotation: number | string = 0;
    @Input() sensitivityButtons$: BehaviorSubject<number | boolean | 'reset'>;
    @ViewChild('motionCanvas') motionCanvas: ElementRef<HTMLCanvasElement>;
    @ViewChild('selectionCanvas') selectionCanvas: ElementRef<HTMLCanvasElement>;
    @HostListener('contextmenu', ['$event'])
    preventContext = (event: Event): void => event.preventDefault();
    unsub$: Subject<boolean> = new Subject();
    motionMask: MotionMaskState | undefined;
    motionMaskRenderer: MotionMaskRenderer | undefined;
    readonly cameraSettings: CameraSettings = {
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

    constructor(
        private deviceService: DeviceDetectorService,
        @Inject(WINDOW) private window: Window,
    ) {
        this.firstCanvasSubject.pipe(take(1), takeUntilDestroyed()).subscribe(() => {
            setTimeout(() => {
                this.initRenderer();
            });
        });
    }

    ngOnInit(): void {
        this.initMask();
    }

    ngOnChanges({ motionMaskString, height, width }: NgChanges<NxMotionDetectionOverlay>): void {
        if (this.motionMaskString === undefined) {
            return;
        }
        const motionMaskStringDoesNotMatchMotionMaskState =
            motionMaskString?.currentValue !== this.motionMask?.getMaskString();
        const motionMaskStringWasChanged = !!motionMaskString;
        const motionMaskWasUpdated =
            motionMaskStringWasChanged && motionMaskStringDoesNotMatchMotionMaskState;

        if (motionMaskWasUpdated) {
            this.motionMask?.reInitialize(this.motionMaskString);
        }

        const heightChanged = height && !height.isFirstChange();
        const widthChanged = width && !width.isFirstChange();
        if (heightChanged || widthChanged) {
            // TODO: Investigate how to remove this timeout
            setTimeout(() => {
                this.unsub$.next(true);
                this.initMask();
                this.initRenderer();
            });
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
        if (!this.motionMaskString) {
            return;
        }
        this.motionMask = new MotionMaskState(
            this.motionMaskString,
            this.motionCanvas,
            this.sensitivityButtons$,
            this.unsub$,
            this.motionMaskStringChange,
            this.rotation as number,
        );
    }

    /**
     * Renderer has to be initialized after content checked, needs motionCanvas ref.
     */
    private initRenderer(): void {
        if (!this.motionMask) {
            return;
        }
        this.motionMaskRenderer = new MotionMaskRenderer(
            this.motionMask,
            this.cameraSettings.sensitivityColors,
            this.unsub$,
            this.sensitivityButtons$,
            this.deviceService.isMobile() || this.deviceService.isTablet(),
            this.window,
        );

        this.motionMaskRenderer.initCanvas(this.motionCanvas, this.selectionCanvas);
    }
}
