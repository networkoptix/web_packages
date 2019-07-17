import {
    Component, EventEmitter, Input,
    OnInit, Output, SimpleChanges
}                          from '@angular/core';
import { NxConfigService } from '../../../../services/nx-config';
import { NxUriService }    from '../../../../services/uri.service';

@Component({
    selector   : 'nx-cam-view',
    templateUrl: './cam-view.component.html',
    styleUrls  : ['./cam-view.component.scss']
})
export class CamViewComponent implements OnInit {

    @Input() activeCamera: any;
    // private _activeCamera: any;
    @Output() public onCloseView: EventEmitter<any> = new EventEmitter<any>();
    @Output() public onFeedbackClick: EventEmitter<any> = new EventEmitter<any>();

    CONFIG: any = {};
    firmwares: any = [];
    firmwaresToShow: number;
    showAll: boolean;
    debug: any;
    beta: any;
    params: any;

    constructor(private configService: NxConfigService,
                private uri: NxUriService) {
        this.CONFIG = this.configService.getConfig();
    }

    ngOnInit() {
        this.uri
            .getURI()
            .subscribe(params => {
                this.params = params;
                this.debug = params.debug === '' || false;
                this.beta = params.beta === '' || false;
            });

        this.firmwareCleanUp();
        this.firmwaresToShow = this.CONFIG.ipvd.firmwaresToShow;
        this.showAll = false;
    }

    ngOnChanges(changes: SimpleChanges) {
        if (changes.activeCamera) {
            this.firmwareCleanUp();
            this.firmwaresToShow = this.CONFIG.ipvd.firmwaresToShow;
            this.showAll = false;
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

    firmwareCleanUp() {
        if (this.activeCamera.firmwares) {
            this.firmwares = this.activeCamera.firmwares.filter((fw) => !fw.name.match(/[<>]+/g));
        }
    }

    firmwarePercentage(count, total) {
        const percentage = Math.round((count / total) * 100);
        return percentage ? percentage + '%' : '< 1';
    }

    firmwareLength(count, maxFirmware) {
        const pow = maxFirmware > 200 ? Math.log2(200) / Math.log2(maxFirmware) : 1;
        const length = Math.round(100 * Math.pow(count / maxFirmware, pow));

        return (length >= 2) ? length : 2;
    }
}
