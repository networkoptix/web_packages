import {
    Component,
    Input,
    OnInit,
    OnChanges,
    OnDestroy
} from '@angular/core';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';

import { NxMenuService } from '@app/menu/menu.service';
import { icons } from '@lib/variables/static-variables';
import type { NgChanges } from '@utils/ng-changes';

import type { Level3Item } from '../menu.types';

/* Usage
 */

@UntilDestroy()
@Component({
    selector: 'nx-level-4-item',
    templateUrl: 'level-4-item.component.html',
    styleUrls: ['level-4-item.component.scss']
})
export class NxLevel4ItemComponent implements OnInit, OnChanges, OnDestroy {
    @Input() base: string = '';
    @Input() item: Level3Item;
    @Input() selected: boolean;
    @Input() first: boolean;
    @Input() idx: number;

    itemPath: string;
    menuNavItemId: string;
    search: RegExp;
    icons = icons;

    constructor(
        private menuService: NxMenuService,
    ) {}

    ngOnInit(): void {
        this.menuService.navItemSubject
            .pipe(untilDestroyed(this))
            .subscribe(() => {
                this.menuNavItemId = this.menuService.navItemId;
            });

        this.menuService.searchRegexSubject
            .pipe(untilDestroyed(this))
            .subscribe(search => {
                this.search = search;
            });
    }

    ngOnDestroy(): void {}

    ngOnChanges(changes: NgChanges<NxLevel4ItemComponent>): void {
        if (changes.base?.currentValue) {
            this.itemPath = this.base;
        }
        if (changes.item?.currentValue) {
            this.itemPath = this.base;
            this.itemPath += (changes.item.currentValue.path !== '')
                ? `/${changes.item.currentValue.path}`
                : '';
        }
    }

    setNavIdx(item: Level3Item): void {
        this.menuService.hoverItemId = item.id;
    }
}
