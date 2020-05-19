import {
    AfterViewInit,
    Component, ElementRef, EventEmitter, Input,
    Output, ViewChild
}                                   from '@angular/core';
import { NxHealthService }          from '../../health.service';
import { NxHealthLayoutService }    from '../../health-layout.service';
import { NxConfigService, IConfig } from '../../../../services/nx-config';
import { NxScrollMechanicsService } from '../../../../services/scroll-mechanics.service';

@Component({
    selector    : 'nx-dynamic-table-panel-component',
    templateUrl : './dynamic-table-panel.component.html',
    styleUrls   : ['./dynamic-table-panel.component.scss']
})
export class NxDynamicTablePanelComponent implements AfterViewInit {

    @Input() panelParams;
    @Output() public onCloseView: EventEmitter<any> = new EventEmitter<any>();

    CONFIG: IConfig;
    name: string;

    windowSize: any = {};
    clientHeight: number;
    offsetHeight: number;
    scrollHeight: number;

    @ViewChild('nxPanelView', { static: false }) nxPanelView: ElementRef;

    constructor(
        configService: NxConfigService,
        public healthService: NxHealthService,
        public healthLayoutService: NxHealthLayoutService,
        private scrollMechanicsService: NxScrollMechanicsService
    ) {
        this.CONFIG = configService.getConfig();
        this.healthLayoutService.activeEntitySubject.subscribe((activeEntity: any) => {
            this.name = activeEntity ? this.healthService.findEntityName(activeEntity) : '';
        });
    }

    ngAfterViewInit() {
        this.scrollMechanicsService.panelVisible = true;
    }

    closeView() {
        this.healthLayoutService.activeEntity = undefined;
        this.onCloseView.emit(undefined);
    }
}
