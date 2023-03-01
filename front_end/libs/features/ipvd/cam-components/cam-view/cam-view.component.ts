import {
    AfterViewInit,
    Component,
    ElementRef,
    EventEmitter,
    Input,
    OnDestroy,
    OnInit,
    Output,
    ViewChild,
} from '@angular/core';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { delay } from 'rxjs/operators';

import staticLang from '@common/language/language_i18n_static.json';
import type { Cameras, Firmwares } from '@services/nx-cloud-api/nx-cloud-api.types';
import type { IConfig } from '@services/nx-config/config-types';
import { NxConfigService } from '@services/nx-config/nx-config.service';
import { NxScrollMechanicsService } from '@services/scroll-mechanics.service';
import { NxUriService } from '@services/uri.service';
import { NgChanges } from '@utils/ng-changes';

import type { IpvdParams } from '../../ipvd.types';

@UntilDestroy()
@Component({
    selector: 'nx-cam-view',
    templateUrl: './cam-view.component.html',
    styleUrls: ['./cam-view.component.scss'],
})
export class CamViewComponent implements OnInit, AfterViewInit, OnDestroy {
    @Input() activeCamera: Cameras;
    @Output() public onCloseView = new EventEmitter<Cameras>();
    @Output() public onFeedbackClick = new EventEmitter<Cameras>();

    CONFIG: IConfig;
    LANG = staticLang;
    firmwares: Firmwares[];
    firmwaresToShow: number;
    analyticsToShow: number;
    showAllFirmware: boolean = false;
    showAllEvents: boolean = false;
    debug: boolean;
    beta: boolean;
    params: IpvdParams;
    showAnalytics: boolean;
    showCameraAnalytics: boolean;

    scrollHeight: number;
    viewScrollFixedTop: boolean = false;
    viewScrollFixedBottom: boolean = false;

    camera: { title: string; param?: string; secondaryParam?: string }[];

    @ViewChild('nxCamView', { static: false })
    cameraView: ElementRef<HTMLDivElement>;

    constructor(
        configService: NxConfigService,
        private scrollMechanicsService: NxScrollMechanicsService,
        private uri: NxUriService,
    ) {
        this.CONFIG = configService.getConfig();
    }

    ngOnInit(): void {
        this.camera = [
            { title: this.LANG.ipvd.maxResolution, param: 'maxResolution' },
            { title: this.LANG.ipvd.maxFps, param: 'maxFps' },
            { title: this.LANG.ipvd.primaryCodec, secondaryParam: 'primaryCodec' },
            { title: this.LANG.ipvd.isAudioSupported, param: 'isAudioSupported' },
            { title: this.LANG.ipvd.isTwAudioSupported, param: 'isTwAudioSupported' },
            { title: this.LANG.ipvd.isPtzSupported, param: 'isPtzSupported' },
            { title: this.LANG.ipvd.isAptzSupported, param: 'isAptzSupported' },
            { title: this.LANG.ipvd.isMdSupported, param: 'isMdSupported' },
            { title: this.LANG.ipvd.isFisheye, param: 'isFisheye' },
            { title: this.LANG.ipvd.isIoSupported, param: 'isIoSupported' },
            { title: this.LANG.ipvd.isDualStreamingSupported, param: 'isDualStreamingSupported' },
            { title: this.LANG.ipvd.sndResolution, param: 'sndResolution' },
            { title: this.LANG.ipvd.isMultiSensor, param: 'isMultiSensor' },
            { title: this.LANG.ipvd.isAnalyticsSupported, param: 'isAnalyticsSupported' }
        ];
        this.uri.getParams()
            .pipe(untilDestroyed(this))
            .subscribe(params => {
                this.params = params;
                this.debug = (params.debug !== undefined);
                this.beta = (params.beta !== undefined);

                this.showAnalytics = this.CONFIG.ipvd.showAnalyticsEvents ||
                    this.debug ||
                    this.beta;
                this.showCameraAnalytics = this.showAnalytics &&
                    this.activeCamera.isAnalyticsSupported;
            });

        this.firmwaresToShow = this.CONFIG.ipvd.firmwaresToShow;
        this.analyticsToShow = this.CONFIG.ipvd.analyticsToShow;
    }

    ngOnDestroy(): void {}

    ngAfterViewInit(): void {
        setTimeout(() => {
            this.scrollHeight =
                this.scrollMechanicsService.searchViewHeightSubject.getValue() +
                NxScrollMechanicsService.HEADER_OFFSET;
            this.calcElementScrollMechanics();
        });

        this.scrollMechanicsService.windowScrollSubject
            .pipe(untilDestroyed(this))
            .subscribe(() => {
                this.calcElementScrollMechanics();
            });

        this.scrollMechanicsService.searchViewHeightSubject
            .pipe(
                untilDestroyed(this),
                delay(0)
            )
            .subscribe(() => {
                this.scrollHeight =
                    this.scrollMechanicsService.searchViewHeight +
                    NxScrollMechanicsService.HEADER_OFFSET;
            });
    }

    ngOnChanges(changes: NgChanges<CamViewComponent>): void {
        if (changes.activeCamera.currentValue) {
            this.showCameraAnalytics = this.showAnalytics &&
                changes.activeCamera.currentValue.isAnalyticsSupported;
            this.firmwares = changes.activeCamera.currentValue.firmwares || [];
            this.showAllFirmware = false;
            this.showAllEvents = false;
        }
    }

    sendFeedback(): false {
        this.onFeedbackClick.emit(this.activeCamera);
        return false;
    }

    closeView(): void {
        this.activeCamera = undefined;
        this.onCloseView.emit(this.activeCamera);
    }

    calcElementScrollMechanics(): void {
        const {
            height: windowHeight
        } = this.scrollMechanicsService.windowSizeSubject.getValue();
        const { windowScroll } = this.scrollMechanicsService;

        const { clientHeight } = this.cameraView.nativeElement;
        const { searchViewHeight } = this.scrollMechanicsService;

        const { SCROLL_OFFSET } = NxScrollMechanicsService;

        this.viewScrollFixedTop = (
            clientHeight < windowHeight - searchViewHeight &&
            windowScroll >= this.scrollHeight - SCROLL_OFFSET
        );
        this.viewScrollFixedBottom = (
            clientHeight > windowHeight - SCROLL_OFFSET - 8 &&
            (clientHeight - windowHeight + 18) < (windowScroll - this.scrollHeight)
        );
    }
}
