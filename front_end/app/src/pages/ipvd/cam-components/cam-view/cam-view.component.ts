import {
    AfterViewInit,
    Component, ElementRef, EventEmitter, Input, OnDestroy,
    OnInit, Output, SimpleChanges, ViewChild
}                                   from '@angular/core';
import { NxConfigService }          from '../../../../services/nx-config';
import { NxUriService }             from '../../../../services/uri.service';
import { Subscription }             from 'rxjs';
import { NxScrollMechanicsService } from '../../../../services/scroll-mechanics.service';
import { AutoUnsubscribe }          from 'ngx-auto-unsubscribe';
import { delay }                    from 'rxjs/operators';

@AutoUnsubscribe()
@Component({
    selector   : 'nx-cam-view',
    templateUrl: './cam-view.component.html',
    styleUrls  : ['./cam-view.component.scss']
})
export class CamViewComponent implements OnInit, AfterViewInit, OnDestroy {

    @Input() activeCamera: any;
    @Output() public onCloseView: EventEmitter<any> = new EventEmitter<any>();
    @Output() public onFeedbackClick: EventEmitter<any> = new EventEmitter<any>();

    CONFIG: any = {};
    firmwares: any = [];
    firmwaresToShow: number;
    analyticsToShow: number;
    showAllFirmware: boolean;
    showAllEvents: boolean;
    debug: any;
    beta: any;
    params: any;
    showAnalytics: boolean;
    showCameraAnalytics: boolean;

    windowSize: any = {};
    windowScroll: any;
    searchHeight: number;
    clientHeight: number;
    offsetHeight: number;
    scrollHeight: number;
    viewScrollFixedTop: boolean;
    viewScrollFixedBottom: boolean;

    elementWidth: any;

    private uriSubscription: Subscription;
    private windowScrollSubscription: Subscription;
    private elementViewWidthSubscription: Subscription;
    private searchViewHeightSubscription: Subscription;

    @ViewChild('nxCamView', { static: false }) cameraView: ElementRef;

    constructor(
            private configService: NxConfigService,
            private scrollMechanicsService: NxScrollMechanicsService,
            private uri: NxUriService,
    ) {
        this.CONFIG = this.configService.getConfig();

        this.viewScrollFixedTop = false;
        this.viewScrollFixedBottom = false;
        this.elementWidth = '100%';
    }

    ngOnInit() {
        this.uriSubscription = this.uri
            .getURI()
            .subscribe(params => {
                this.params = params;
                this.debug = (params.debug !== undefined);
                this.beta = (params.beta !== undefined);

                this.showAnalytics = this.CONFIG.ipvd.showAnalyticsEvents || this.debug || this.beta;
                this.showCameraAnalytics = this.showAnalytics && this.activeCamera.isAnalyticsSupported;
            });

        this.firmwaresToShow = 1; // this.CONFIG.ipvd.firmwaresToShow;
        this.analyticsToShow = this.CONFIG.ipvd.analyticsToShow;
        this.showAllFirmware = false;
        this.showAllEvents = false;
    }

    ngOnDestroy() {}

    ngAfterViewInit(): void {
        setTimeout(() => {
            this.scrollHeight = this.scrollMechanicsService.searchViewHeightSubject.getValue() + NxScrollMechanicsService.HEADER_OFFSET;
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
                const width = this.scrollMechanicsService.elementViewWidthSubject.getValue();
                this.elementWidth = (width > 0) ? (width - 8 /* -gutter */) + 'px' : '100%';
            });

        this.searchViewHeightSubscription = this.scrollMechanicsService
            .searchViewHeightSubject.pipe(delay(0))
            .subscribe(() => {
                this.scrollHeight = this.scrollMechanicsService.searchViewHeightSubject.getValue() + NxScrollMechanicsService.HEADER_OFFSET;
            });
    }

    ngOnChanges(changes: SimpleChanges) {
        if (changes.activeCamera) {
            this.showCameraAnalytics = this.showAnalytics && changes.activeCamera.currentValue.isAnalyticsSupported;
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
        this.windowScroll = this.scrollMechanicsService.windowScrollSubject.getValue();

        this.clientHeight = this.cameraView.nativeElement.clientHeight;
        this.searchHeight = this.scrollMechanicsService.searchViewHeightSubject.getValue();

        if (this.clientHeight < this.windowSize.height - this.searchHeight && this.windowScroll >= this.scrollHeight - NxScrollMechanicsService.SCROLL_OFFSET) {
            this.viewScrollFixedTop = true;
        } else {
            this.viewScrollFixedTop = false;
        }

        if (this.clientHeight > this.windowSize.height - NxScrollMechanicsService.SCROLL_OFFSET - 8 && (this.clientHeight - this.windowSize.height + 18) < (this.windowScroll - this.scrollHeight)) {
            this.viewScrollFixedBottom = true;
        } else {
            this.viewScrollFixedBottom = false;
        }
    }
}
