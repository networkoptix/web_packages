import {
    Component, EventEmitter, Input, OnChanges,
    OnInit, Output, SimpleChanges
} from '@angular/core';
import { Router }                   from '@angular/router';

import { NxConfigService, IConfig } from '@services/nx-config';
import { NxMenuService }            from '@src/menu';

/* Usage
 */

@Component({
    selector    : 'nx-api-level-1-item',
    templateUrl : 'level-1-item.component.html',
    styleUrls   : ['level-1-item.component.scss']
})
export class NxApiLevel1ItemComponent implements OnInit, OnChanges {
    @Input() searchMode: boolean;
    @Input() base: any = {};
    @Input() item: any = {};
    @Input() selected: boolean;

    @Output() toggle: EventEmitter<any> = new EventEmitter<any>();

    itemPath: string;
    _toggle: boolean;
    _type: string;

    CONFIG: IConfig;

    constructor(configService: NxConfigService,
                private router: Router,
                private menuService: NxMenuService
    ) {
        this.CONFIG = configService.getConfig();

        this._toggle = true;
    }

    ngOnInit() {
        this.itemPath = this.base;
        this.itemPath += (this.item.path !== '') ? '/' + this.item.path : '';
    }

    ngOnChanges(changes: SimpleChanges) {
        if (changes.base?.currentValue) {
            this.itemPath = changes.base.currentValue;
            this.itemPath += (this.item.path !== '') ? '/' + this.item.path : '';
        }

        if (changes.searchMode?.currentValue) {
            this._type = changes.searchMode?.currentValue ? 'arrow_collapse' : 'arrow_expand';
            this._toggle = false;
        }

        if (changes.selected) {
            this._toggle = !changes.selected.currentValue;
        }
    }

    menuClick(sectionId) {
        if (!this.searchMode) {
            this.menuService.section = sectionId;
            this.menuService.detail = '';
            this.menuService.subSection = [];
            this.toggleNode();
            if (this.itemPath) {
                this.router
                    .navigate([this.itemPath], { queryParams: { search: this.item.query } })
                    .catch((ex) => console.error(ex));
            }
        } else {
            this.toggleNode();
        }
    }

    toggleNode() {
        this._type = this._toggle ? 'arrow_collapse' : 'arrow_expand';
        this._toggle = !this._toggle;
        this.toggle.emit(this._toggle);
    }
}
