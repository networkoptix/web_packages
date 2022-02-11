import { Component, Input, OnInit } from '@angular/core';

import { NxMenuService } from '@src/menu/menu.service';
import type { NgChanges } from '@utils/ng-changes';

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

    constructor(private menuService: NxMenuService) {}

    ngOnInit(): void {
        this.itemPath = this.base;
        this.itemPath += (this.item.path !== '') ? `/${this.item.path}` : '';
    }

    ngOnChanges(changes: NgChanges<NxLevel2ItemComponent>): void {
        if (changes.item?.currentValue) {
            this.item.additionalText = this.menuService.getAdditionalText(
                changes.item.currentValue.additionalLabel
            );
        }
    }
}
