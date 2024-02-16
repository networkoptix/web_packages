import { Component, Input, OnChanges } from '@angular/core';

import { NxMenuService } from '@menu/menu.service';
import { icons } from '@static-variables';
import type { NgChanges } from '@utils/ng-changes';

import type { Level3Item } from '../menu.types';

/* Usage
 */

@Component({
    selector: 'nx-level-4-item',
    templateUrl: 'level-4-item.component.html',
    styleUrls: ['level-4-item.component.scss'],
})
export class NxLevel4ItemComponent implements OnChanges {
    @Input() base: string = '';
    @Input() item: Level3Item;
    @Input() selected: boolean;
    @Input() first: boolean;
    @Input() idx: number;

    itemPath: string;
    menuNavItemId$$ = this.menuService.navItemId$$.asReadonly();
    search$$ = this.menuService.searchRegex$$.asReadonly();
    icons = icons;

    constructor(private menuService: NxMenuService) {}

    ngOnChanges(changes: NgChanges<NxLevel4ItemComponent>): void {
        if (changes.base?.currentValue) {
            this.itemPath = this.base;
        }
        if (changes.item?.currentValue) {
            this.itemPath = this.base;
            this.itemPath +=
                changes.item.currentValue.path !== '' ? `/${changes.item.currentValue.path}` : '';
        }
    }

    setNavIdx(item: Level3Item): void {
        this.menuService.hoverItemId$$.set(item.id);
    }
}
