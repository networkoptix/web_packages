import {
    Component, EventEmitter, Input, OnChanges,
    OnInit, Output, SimpleChanges
} from '@angular/core';
import { NxConfigService, IConfig } from '../../services/nx-config';
import { NxMenuService }            from '../menu.service';

/* Usage
 */

@Component({
    selector    : 'nx-level-1-item',
    templateUrl : 'level-1-item.component.html',
    styleUrls   : ['level-1-item.component.scss']
})
export class NxLevel1ItemComponent implements OnInit, OnChanges {
    @Input() searchMode: boolean;
    @Input() base: any = {};
    @Input() item: any = {};
    @Input() selected: boolean;

    @Output() toggle: EventEmitter<any> = new EventEmitter();

    itemPath: string;
    _toggle: boolean;

    CONFIG: IConfig;

    constructor(configService: NxConfigService,
                private menuService: NxMenuService
    ) {
        this.CONFIG = configService.getConfig();

        this._toggle = false;
    }

    ngOnInit() {
        this.itemPath = this.base;
        this.itemPath += (this.item.path !== '') ? '/' + this.item.path : '';
    }

    ngOnChanges(changes: SimpleChanges) {
        if (changes.base && changes.base.currentValue) {
            this.itemPath = changes.base.currentValue;
            this.itemPath += (this.item.path !== '') ? '/' + this.item.path : '';
        }
    }

    menuClick(sectionId) {
        this.menuService.setSection(sectionId);
    }

    toggleNode() {
        this._toggle = !this._toggle;
        this.toggle.emit(this._toggle);
    }
}
