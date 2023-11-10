import { CommonModule } from '@angular/common';
import { Component, Input, OnChanges, computed, Signal } from '@angular/core';
import { RouterModule } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { AngularSvgIconModule } from 'angular-svg-icon';

import { NxSearchComponent } from '@components/search/search.component';
import { NxSearchHighlightComponent } from '@components/search-highlight/search-highlight.component';
import { NxMenuService } from '@menu/menu.service';
import { PipesModule } from '@pipes/pipes.module';
import { icons } from '@static-variables';
import type { NgChanges } from '@utils/ng-changes';

import type { Level3Item } from '../menu.types';

/* Usage
 */

@Component({
    selector: 'nx-level-3-item',
    templateUrl: 'level-3-item.component.html',
    styleUrls: ['level-3-item.component.scss'],
    standalone: true,
    imports: [
        CommonModule,
        RouterModule,
        TranslateModule,
        AngularSvgIconModule,
        NxSearchComponent,
        NxSearchHighlightComponent,
        PipesModule,
    ],
})
export class NxLevel3ItemComponent implements OnChanges {
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

    ngOnChanges(changes: NgChanges<NxLevel3ItemComponent>): void {
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
