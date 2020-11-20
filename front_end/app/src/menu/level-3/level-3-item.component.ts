import {
    Component, Input, OnInit,
    OnChanges, SimpleChanges, OnDestroy
} from '@angular/core';
import { Router }                   from '@angular/router';
import { UntilDestroy }             from '@ngneat/until-destroy';
import { SubscriptionLike }         from 'rxjs';

import { NxConfigService, IConfig } from '../../services/nx-config';
import { NxMenuService }            from '@src/menu';

/* Usage
 */

@UntilDestroy({ checkProperties: true })
@Component({
    selector    : 'nx-level-3-item',
    templateUrl : 'level-3-item.component.html',
    styleUrls   : ['level-3-item.component.scss']
})
export class NxLevel3ItemComponent implements OnInit, OnChanges, OnDestroy {
    @Input() base: any = {};
    @Input() item: any = {};
    @Input() selected: boolean;
    @Input() first: boolean;
    @Input() idx: number;

    CONFIG: IConfig;

    itemPath: string;
    itemSearch: string;
    isEnabled: boolean;
    menuNavItemId: string;

    navItemSubscription: SubscriptionLike;

    public hovered: boolean;

    constructor(
        configService: NxConfigService,
        private router: Router,
        private menuService: NxMenuService,
    ) {
        this.CONFIG = configService.getConfig();
    }

    ngOnInit() {
        this.itemPath = this.base;
        this.itemPath += (this.item.path !== '') ? '/' + this.item.path : '';
        this.itemSearch = this.item.query?.search;
        this.isEnabled = this.item.isEnabled === undefined ? true : this.item.isEnabled;

        this.navItemSubscription = this.menuService.navItemSubject.subscribe(() => {
            this.menuNavItemId = this.menuService.navItemId;
        });
    }

    ngOnDestroy(): void {}

    ngOnChanges(changes: SimpleChanges) {
        if (changes.item) {
            this.isEnabled = (changes.item.currentValue.isEnabled === undefined) ? true : changes.item.currentValue.isEnabled;

            this.item.additionalText = (typeof changes.item.currentValue.additionalLabel === 'function')
                ? changes.item.currentValue.additionalLabel() : changes.item.currentValue.additionalLabel;
        }
    }

    setNavIdx(item) {
        this.menuService.hoverItemId = item.id;
    }
}
