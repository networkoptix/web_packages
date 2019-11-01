import {
    Component, EventEmitter, Input, OnChanges,
    Output, SimpleChanges
}                          from '@angular/core';
import { NxConfigService } from '../../../../services/nx-config';
import { NxUriService }    from '../../../../services/uri.service';
import { NxUtilsService }  from '../../../../services/utils.service';

@Component({
    selector   : 'nx-dynamic-table-panel-component',
    templateUrl: './dynamic-table-panel.component.html',
    styleUrls  : ['./dynamic-table-panel.component.scss']
})
export class NxDynamicTablePanelComponent implements OnChanges {

    @Input() panelParams: any;
    @Input() activeEntity: any;
    @Output() public onCloseView: EventEmitter<any> = new EventEmitter<any>();
    // @Output() public onFeedbackClick: EventEmitter<any> = new EventEmitter<any>();

    CONFIG: any = {};
    name: string;

    constructor(private configService: NxConfigService) {
        this.CONFIG = this.configService.getConfig();
    }

    ngOnChanges(changes: SimpleChanges) {
        if (changes.activeEntity && changes.activeEntity.currentValue) {
            this.findName(changes.activeEntity.currentValue);
        }
    }

    findName(entity) {
        if (entity._ && entity._.name) {
            this.name = entity._.name.text;
        } else if (entity.info && entity.info.name) {
            this.name = entity.info.name;
        } else {
            this.name = '–';
        }
    }

    closeView() {
        this.activeEntity = undefined;
        this.onCloseView.emit(this.activeEntity);
    }
}
