import {
    Component, EventEmitter, Input,
    OnInit, Output, SimpleChanges
}                          from '@angular/core';
import { NxConfigService } from '../../../../services/nx-config';
import { NxUriService }    from '../../../../services/uri.service';
import { NxUtilsService }  from '../../../../services/utils.service';

@Component({
    selector   : 'nx-dynamic-table-panel-component',
    templateUrl: './dynamic-table-panel.component.html',
    styleUrls  : ['./dynamic-table-panel.component.scss']
})
export class NxDynamicTablePanelComponent implements OnInit {

    @Input() panelParams: any;
    @Input() activeEntity: any;
    @Output() public onCloseView: EventEmitter<any> = new EventEmitter<any>();
    // @Output() public onFeedbackClick: EventEmitter<any> = new EventEmitter<any>();

    CONFIG: any = {};
    // firmwares: any = [];
    // firmwaresToShow: number;
    // analyticsToShow: number;
    // showAllFirmware: boolean;
    showAllEvents: boolean;
    debug: any;
    beta: any;
    params: any;
    // showAnalytics: boolean;
    showCameraAnalytics: boolean;

    constructor(private configService: NxConfigService,
                private uri: NxUriService,
                private utilsService: NxUtilsService) {
        this.CONFIG = this.configService.getConfig();
    }

    ngOnInit() {
        // this.uri
        //     .getURI()
        //     .subscribe(params => {
        //         this.params = params;
        //         this.debug = (params.debug !== undefined);
        //         this.beta = (params.beta !== undefined);
        //
        //         this.showAnalytics = this.CONFIG.ipvd.showAnalyticsEvents || this.debug || this.beta;
        //         this.showCameraAnalytics = this.showAnalytics && this.activeCamera.isAnalyticsSupported;
        //     });

        // this.firmwaresToShow = 1; // this.CONFIG.ipvd.firmwaresToShow;
        // this.analyticsToShow = this.CONFIG.ipvd.analyticsToShow;
        // this.showAllFirmware = false;
        // this.showAllEvents = false;
    }

    ngOnChanges(changes: SimpleChanges) {
        // if (changes.activeCamera) {
        //     this.showCameraAnalytics = this.showAnalytics && changes.activeCamera.currentValue.isAnalyticsSupported;
        //     this.firmwares = changes.activeCamera.currentValue.firmwares || [];
        //     this.showAllFirmware = false;
        //     this.showAllEvents = false;
        // }
    }

    // sendFeedback() {
    //     this.onFeedbackClick.emit(this.activeCamera);
    //     return false;
    // }

    closeView() {
        this.activeEntity = undefined;
        this.onCloseView.emit(this.activeEntity);
    }
}
