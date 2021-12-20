import {
    Component,
    Input,
    ViewChild,
    ElementRef,
    OnChanges,
    SimpleChanges,
    AfterContentChecked,
    ChangeDetectionStrategy,
    HostListener,
    Output,
    EventEmitter
} from '@angular/core';
import { BehaviorSubject, Subject } from 'rxjs';

import { NxConfigService, IConfig } from '@services/nx-config';
import { NxUtilsService } from '@services/utils.service';

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
    @HostListener('contextmenu', ['$event']) preventContext = event => event.preventDefault();
    unsub$: Subject<boolean> = new Subject();
    motionMask: MotionMaskState;
    motionMaskRenderer: MotionMaskRenderer;
    config: IConfig;

    @Output() updateMask: EventEmitter<string> = new EventEmitter();

    constructor(
        config: NxConfigService,
        private utilsService: NxUtilsService
    ) {
        this.config = config.getConfig();
    };

    ngOnInit() {
        this.initMask();
    }

    ngOnChanges({ initialMask, height, width }: SimpleChanges) {
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

    ngAfterContentChecked() {
        const firstRender = !this.motionMaskRenderer &&
            this.motionCanvas &&
            this.motionCanvas.nativeElement;
        if (firstRender) {
            this.initRenderer();
        }
    }

    ngOnDestroy() {
        this.unsub$.next(true);
    }

    // Init methods
    private initMask() {
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
    private initRenderer() {
        this.motionMaskRenderer = new MotionMaskRenderer(
            this.motionMask,
            this.config.cameraSettings.sensitivityColors,
            this.unsub$,
            this.sensitivityButtons$,
            this.utilsService.isMobile() || this.utilsService.isTablet()

        );

        this.motionMaskRenderer.initCanvas(this.motionCanvas, this.selectionCanvas);
    }
}
