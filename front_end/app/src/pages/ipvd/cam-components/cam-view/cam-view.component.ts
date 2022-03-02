import {
    AfterViewInit,
    Component,
    ElementRef,
    EventEmitter,
    Input,
    OnDestroy,
    OnInit,
    Output,
    ViewChild
} from '@angular/core';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { Subscription } from 'rxjs';
import { delay } from 'rxjs/operators';

import { LanguageI18NStaticTypes } from '@app/language_i18n_static_types';
import type { IConfig } from '@services/nx-config/config-types';
import { NxConfigService } from '@services/nx-config/nx-config.service';
import { NxLanguageProviderService } from '@services/nx-language-provider';
import { NxScrollMechanicsService } from '@services/scroll-mechanics.service';
import { NxUriService } from '@services/uri.service';
import { NgChanges } from '@utils/ng-changes';

@UntilDestroy({ checkProperties: true })
@Component({
    selector: 'nx-cam-view',
    templateUrl: './cam-view.component.html',
    styleUrls: ['./cam-view.component.scss']
})
export class CamViewComponent implements OnInit, AfterViewInit, OnDestroy {
    @Input() activeCamera;
    @Output() public onCloseView: EventEmitter<any> = new EventEmitter<any>();
    @Output() public onFeedbackClick: EventEmitter<any> = new EventEmitter<any>();

    CONFIG: IConfig;
    LANG: LanguageI18NStaticTypes;
    firmwares: any = [];
    firmwaresToShow: number;
    analyticsToShow: number;
    showAllFirmware: boolean;
    showAllEvents: boolean;
    debug;
    beta;
    params;
    showAnalytics: boolean;
    showCameraAnalytics: boolean;

    windowSize: any = {};
    windowScroll;
    searchHeight: number;
    clientHeight: number;
    offsetHeight: number;
    scrollHeight: number;
    viewScrollFixedTop: boolean;
    viewScrollFixedBottom: boolean;

    elementWidth;
    camera: { title: string, param?: string, secondaryParam?: string }[];

    private windowScrollSubscription: Subscription;
    private elementViewWidthSubscription: Subscription;
    private searchViewHeightSubscription: Subscription;

    @ViewChild('nxCamView', { static: false }) cameraView: ElementRef;

    constructor(
        configService: NxConfigService,
        languageService: NxLanguageProviderService,
        private scrollMechanicsService: NxScrollMechanicsService,
        private uri: NxUriService
    ) {
        this.CONFIG = configService.getConfig();
        this.LANG = languageService.translations;
        this.viewScrollFixedTop = false;
        this.viewScrollFixedBottom = false;
        this.elementWidth = '100%';
    }

    ngOnInit() {
        this.camera = [
            { title: this.LANG.ipvd.maxResolution?.(), param: 'maxResolution' },
            { title: this.LANG.ipvd.maxFps?.(), param: 'maxFps' },
            { title: this.LANG.ipvd.primaryCodec?.(), secondaryParam: 'primaryCodec' },
            { title: this.LANG.ipvd.isAudioSupported?.(), param: 'isAudioSupported' },
            { title: this.LANG.ipvd.isTwAudioSupported?.(), param: 'isTwAudioSupported' },
            { title: this.LANG.ipvd.isPtzSupported?.(), param: 'isPtzSupported' },
            { title: this.LANG.ipvd.isAptzSupported?.(), param: 'isAptzSupported' },
            { title: this.LANG.ipvd.isMdSupported?.(), param: 'isMdSupported' },
            { title: this.LANG.ipvd.isFisheye?.(), param: 'isFisheye' },
            { title: this.LANG.ipvd.isIoSupported?.(), param: 'isIoSupported' },
            { title: this.LANG.ipvd.isDualStreamingSupported?.(), param: 'isDualStreamingSupported' },
            { title: this.LANG.ipvd.sndResolution?.(), param: 'sndResolution' },
            { title: this.LANG.ipvd.isMultiSensor?.(), param: 'isMultiSensor' },
            { title: this.LANG.ipvd.isAnalyticsSupported?.(), param: 'isAnalyticsSupported' }
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
        this.showAllFirmware = false;
        this.showAllEvents = false;
    }

    ngOnDestroy() {}

    ngAfterViewInit(): void {
        setTimeout(() => {
            this.scrollHeight =
                this.scrollMechanicsService.searchViewHeightSubject.getValue() +
                NxScrollMechanicsService.HEADER_OFFSET;
            this.calcElementScrollMechanics();
        });

        this.windowScrollSubscription = this.scrollMechanicsService
            .windowScrollSubject
            .subscribe(() => {
                this.calcElementScrollMechanics();
            });

        this.elementViewWidthSubscription = this.scrollMechanicsService
            .elementViewWidthSubject
            .subscribe(() => {
                const width = this.scrollMechanicsService.elementViewWidth;
                this.elementWidth = (width > 0)
                    ? (width - 8 /* -gutter */) + 'px'
                    : '100%';
            });

        this.searchViewHeightSubscription = this.scrollMechanicsService
            .searchViewHeightSubject.pipe(delay(0))
            .subscribe(() => {
                this.scrollHeight =
                    this.scrollMechanicsService.searchViewHeight +
                    NxScrollMechanicsService.HEADER_OFFSET;
            });
    }

    ngOnChanges(changes: NgChanges<CamViewComponent>) {
        if (changes.activeCamera.currentValue) {
            this.showCameraAnalytics = this.showAnalytics &&
                changes.activeCamera.currentValue.isAnalyticsSupported;
            this.firmwares = changes.activeCamera.currentValue.firmwares || [];
            this.showAllFirmware = false;
            this.showAllEvents = false;
        }
    }

    sendFeedback() {
        this.onFeedbackClick.emit(this.activeCamera);
        return false;
    }

    closeView() {
        this.activeCamera = undefined;
        this.onCloseView.emit(this.activeCamera);
    }

    calcElementScrollMechanics() {
        this.windowSize = this.scrollMechanicsService.windowSizeSubject.getValue();
        this.windowScroll = this.scrollMechanicsService.windowScroll;

        this.clientHeight = this.cameraView.nativeElement.clientHeight;
        this.searchHeight = this.scrollMechanicsService.searchViewHeight;

        if (
            this.clientHeight < this.windowSize.height - this.searchHeight &&
            this.windowScroll >= this.scrollHeight - NxScrollMechanicsService.SCROLL_OFFSET
        ) {
            this.viewScrollFixedTop = true;
        } else {
            this.viewScrollFixedTop = false;
        }

        if (
            this.clientHeight > this.windowSize.height -
                NxScrollMechanicsService.SCROLL_OFFSET - 8 &&
            (this.clientHeight - this.windowSize.height + 18) <
                (this.windowScroll - this.scrollHeight)
        ) {
            this.viewScrollFixedBottom = true;
        } else {
            this.viewScrollFixedBottom = false;
        }
    }
}
