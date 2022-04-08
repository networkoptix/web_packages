import {
    Component,
    EventEmitter,
    Input,
    OnChanges,
    OnInit,
    Output,
} from '@angular/core';
import { Router } from '@angular/router';

import type { IConfig } from '@services/nx-config/config-types';
import { NxConfigService } from '@services/nx-config/nx-config.service';
import { NxMenuService } from '@src/menu/menu.service';
import type { NgChanges } from '@utils/ng-changes';

import type { Level1Item } from '../menu.types';

/* Usage
 */

@Component({
    selector: 'nx-level-1-item',
    templateUrl: 'level-1-item.component.html',
    styleUrls: ['level-1-item.component.scss']
})
export class NxLevel1ItemComponent implements OnInit, OnChanges {
    @Input() searchMode: boolean;
    @Input() base: string = '';
    @Input() item: Level1Item;
    @Input() selected: boolean;

    @Output() toggle = new EventEmitter<boolean>();

    itemPath: string;
    _toggle: boolean;
    _type: string;
    _searchableItemsLength: number;

    CONFIG: IConfig;

    constructor(
        configService: NxConfigService,
        private router: Router,
        private menuService: NxMenuService
    ) {
        this.CONFIG = configService.getConfig();
    }

    ngOnInit(): void {
        this.itemPath = this.base;
        this.itemPath += (this.item.path !== '') ? `/${this.item.path}` : '';
        this._toggle = this.item.toggle || false;
    }

    ngOnChanges(changes: NgChanges<NxLevel1ItemComponent>): void {
        if (changes.base?.currentValue) {
            this.itemPath = changes.base.currentValue;
            this.itemPath += (this.item.path !== '')
                ? `/${this.item.path}`
                : '';
        }

        if (changes.searchMode?.currentValue) {
            this._type = changes.searchMode?.currentValue
                ? 'arrow_collapse'
                : 'arrow_expand';
        }

        if (changes.item?.currentValue) {
            if (this.searchMode) {
                this._searchableItemsLength = changes.item.currentValue.level3
                    .filter(itm => !itm.horizontal)
                    .length;
                this._toggle = changes.item.currentValue.toggle;
            }
        }
    }

    menuClick(sectionId: string): void {
        if (!this.searchMode) {
            this.menuService.section = sectionId;
            if (this.itemPath) {
                this.router
                    .navigate(
                        [this.itemPath],
                        { queryParams: { search: this.item.query } }
                    )
                    .catch(ex => console.error(ex));
            }
        } else {
            this.toggleNode();
        }
    }

    toggleNode(): void {
        this._type = this._toggle ? 'arrow_collapse' : 'arrow_expand';
        this._toggle = !this._toggle;
        this.toggle.emit(this._toggle);
    }
}
