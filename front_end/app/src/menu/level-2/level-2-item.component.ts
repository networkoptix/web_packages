import { Component, Input, OnInit, SimpleChanges } from '@angular/core';

import { NxMenuService } from '@src/menu/menu.service';

import type { Level2Item } from '../menu.types';

/* Usage
 */

@Component({
    selector: 'nx-level-2-item',
    templateUrl: 'level-2-item.component.html',
    styleUrls: ['level-2-item.component.scss']
})
export class NxLevel2ItemComponent implements OnInit {
    @Input() base: string = '';
    @Input() item: Partial<Level2Item> = {};
    @Input() selected: boolean;

    itemPath: string;
    isEnabled: boolean;

    constructor(private menuService: NxMenuService) {
    }

    ngOnInit() {
        this.itemPath = this.base;
        this.itemPath += (this.item.path !== '') ? '/' + this.item.path : '';
        this.isEnabled = this.item.isEnabled === undefined
            ? true
            : this.item.isEnabled;
    }

    ngOnChanges(changes: SimpleChanges) {
        if (changes.item?.currentValue) {
            this.isEnabled = changes.item.currentValue.isEnabled;
            this.item.additionalText = this.menuService.getAdditionalText(
                changes.item.currentValue.additionalLabel
            );
        }
    }
}
