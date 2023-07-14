import { Component, Input, OnChanges, computed, Signal } from '@angular/core';

import { icons } from '@lib/variables/static-variables';
import { NxMenuService } from '@menu/menu.service';
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
    menuNavItemId: Signal<string> = computed(() => this.menuService.navItemId());
    search: Signal<RegExp> = computed(() => this.menuService.searchRegex());
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
        this.menuService.hoverItemId.set(item.id);
    }
}
