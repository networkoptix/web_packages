import {
    Component,
    Input,
    OnInit,
    OnChanges,
    SimpleChanges,
    OnDestroy
} from '@angular/core';
import { Router } from '@angular/router';
import { UntilDestroy } from '@ngneat/until-destroy';
import { SubscriptionLike } from 'rxjs';

import { NxConfigService, IConfig } from '@services/nx-config';
import { NxMenuService } from '@src/menu/menu.service';

import type { Level3Item, MenuModel } from '../menu.types';

/* Usage
 */

@UntilDestroy({ checkProperties: true })
@Component({
    selector: 'nx-level-3-item',
    templateUrl: 'level-3-item.component.html',
    styleUrls: ['level-3-item.component.scss']
})
export class NxLevel3ItemComponent implements OnInit, OnChanges, OnDestroy {
    @Input() base: string = '';
    @Input() item: Partial<Level3Item> = {};
    @Input() selected: boolean;
    @Input() first: boolean;
    @Input() idx: number;

    CONFIG: IConfig;

    itemPath: string;
    isEnabled: boolean;
    menuNavItemId: string;
    queryParams: Partial<MenuModel> = {};

    navItemSubscription: SubscriptionLike;

    public hovered: boolean;

    constructor(
        configService: NxConfigService,
        private router: Router,
        private menuService: NxMenuService
    ) {
        this.CONFIG = configService.getConfig();
    }

    ngOnInit() {
        this.navItemSubscription = this.menuService.navItemSubject.subscribe(() => {
            this.menuNavItemId = this.menuService.navItemId;
        });
    }

    ngOnDestroy(): void {}

    ngOnChanges(changes: SimpleChanges) {
        if (changes.base?.currentValue) {
            this.itemPath = this.base;
        }
        if (changes.item?.currentValue) {
            this.itemPath = this.base;
            this.itemPath += (changes.item.currentValue.path !== '')
                ? '/' + changes.item.currentValue.path
                : '';
            this.queryParams = changes.item.currentValue.query;
            this.isEnabled =
                (changes.item.currentValue.isEnabled === undefined)
                    ? true
                    : changes.item.currentValue.isEnabled;

            if (!changes.item.currentValue.additionalText) {
                this.item.additionalText = this.menuService.getAdditionalText(
                    changes.item.currentValue.additionalLabel
                );
            }
        }
    }

    setNavIdx(item: Partial<Level3Item>) {
        this.menuService.hoverItemId = item.id;
    }
}
