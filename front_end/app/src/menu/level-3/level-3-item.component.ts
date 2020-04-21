import {
    Component, Input, OnInit,
    OnChanges, SimpleChanges
}                                   from '@angular/core';
import { NxConfigService, IConfig } from '../../services/nx-config';

/* Usage
 */

@Component({
    selector    : 'nx-level-3-item',
    templateUrl : 'level-3-item.component.html',
    styleUrls   : ['level-3-item.component.scss']
})
export class NxLevel3ItemComponent implements OnInit, OnChanges {
    @Input() base: any = {};
    @Input() item: any = {};
    @Input() selected: boolean;
    @Input() first: boolean;

    itemPath: string;
    isEnabled: boolean;
    CONFIG: IConfig;

    constructor(configService: NxConfigService
    ) {
        this.CONFIG = configService.getConfig();
    }

    ngOnInit() {
        this.itemPath = this.base;
        this.itemPath += (this.item.path !== '') ? '/' + this.item.path : '';
        this.isEnabled = this.item.isEnabled === undefined ? true : this.item.isEnabled;
    }

    ngOnChanges(changes: SimpleChanges) {
        if (changes.item && changes.item.previousValue && changes.item.previousValue.isEnabled !== changes.item.currentValue.isEnabled) {
            this.isEnabled = changes.item.currentValue.isEnabled;
        }
    }
}
