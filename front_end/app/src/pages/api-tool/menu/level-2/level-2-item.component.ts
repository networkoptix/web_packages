import { Component, EventEmitter, Input, OnInit, Output, SimpleChanges } from '@angular/core';
import { NxConfigService, IConfig } from '@services/nx-config';
import { NxMenuService }                           from '@src/menu';

/* Usage
 */

@Component({
    selector    : 'nx-api-level-2-item',
    templateUrl : 'level-2-item.component.html',
    styleUrls   : ['level-2-item.component.scss']
})
export class NxApiLevel2ItemComponent implements OnInit {
    @Input() searchMode: boolean;
    @Input() base: any = {};
    @Input() item: any = {};
    @Input() selected: boolean;

    CONFIG: IConfig;
    itemPath: string;
    isEnabled: boolean;
    @Output() toggle: EventEmitter<any> = new EventEmitter<any>();

    _toggle: boolean
    _type: string;

    constructor(private menuService: NxMenuService, private configService: NxConfigService) {
        this.CONFIG = configService.getConfig();
    }

    ngOnInit() {
        this.itemPath = this.base;
        this.itemPath += (this.item.path !== '') ? '/' + this.item.path : '';
        this.isEnabled = this.item.isEnabled === undefined ? true : this.item.isEnabled;
    }

    ngOnChanges(changes: SimpleChanges) {
        if (changes.item?.currentValue) {
            this.isEnabled = changes.item.currentValue.isEnabled;
            this.item.additionalText = this.menuService.getAdditionalText(changes.item.currentValue.additionalLabel);
        }
    }

    menuClick(sectionId) {
        this.menuService.subSection = sectionId;
        this.menuService.detail = '';
        this.toggleNode();
    }

    toggleNode() {
        this._type = this._toggle ? 'arrow_collapse' : 'arrow_expand';
        this._toggle = !this._toggle;
        this.toggle.emit(this._toggle);
    }
}
