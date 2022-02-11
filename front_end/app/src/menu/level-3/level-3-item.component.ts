import {
    Component,
    Input,
    OnInit,
    OnChanges,
    OnDestroy
} from '@angular/core';
import { Params } from '@angular/router';
import { UntilDestroy } from '@ngneat/until-destroy';
import { SubscriptionLike } from 'rxjs';

import type { IConfig } from '@services/nx-config/config-types';
import { NxConfigService } from '@services/nx-config/nx-config.service';
import { NxMenuService } from '@src/menu/menu.service';
import type { NgChanges } from '@utils/ng-changes';

import type { Level3Item } from '../menu.types';

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
    menuNavItemId: string;
    queryParams: Params = {};

    navItemSubscription: SubscriptionLike;

    public hovered: boolean;

    constructor(
        configService: NxConfigService,
        private menuService: NxMenuService
    ) {
        this.CONFIG = configService.getConfig();
    }

    ngOnInit(): void {
        this.navItemSubscription = this.menuService.navItemSubject.subscribe(
            () => { this.menuNavItemId = this.menuService.navItemId; }
        );
    }

    ngOnDestroy(): void {}

    ngOnChanges(changes: NgChanges<NxLevel3ItemComponent>): void {
        if (changes.base?.currentValue) {
            this.itemPath = this.base;
        }
        if (changes.item?.currentValue) {
            this.itemPath = this.base;
            this.itemPath += (changes.item.currentValue.path !== '')
                ? `/${changes.item.currentValue.path}`
                : '';
            this.queryParams = changes.item.currentValue.query;

            if (!changes.item.currentValue.additionalText) {
                this.item.additionalText = this.menuService.getAdditionalText(
                    changes.item.currentValue.additionalLabel
                );
            }
        }
    }

    setNavIdx(item: Partial<Level3Item>): void {
        this.menuService.hoverItemId = item.id;
    }
}
