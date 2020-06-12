import {
    Component, Input, OnInit,
    OnChanges, SimpleChanges, OnDestroy
} from '@angular/core';
import { NxConfigService, IConfig } from '../../services/nx-config';
import { NxMenuService }            from '../menu.service';
import { SubscriptionLike }         from 'rxjs';
import { AutoUnsubscribe }          from 'ngx-auto-unsubscribe';

/* Usage
 */

@AutoUnsubscribe()
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

    CONFIG: IConfig;

    itemPath: string;
    isEnabled: boolean;
    menuNavItemId: string;

    navItemSubscription: SubscriptionLike;

    constructor(
        configService: NxConfigService,
        private menuService: NxMenuService
    ) {
        this.CONFIG = configService.getConfig();
    }

    ngOnInit() {
        this.itemPath = this.base;
        this.itemPath += (this.item.path !== '') ? '/' + this.item.path : '';
        this.isEnabled = this.item.isEnabled === undefined ? true : this.item.isEnabled;

        this.navItemSubscription = this.menuService.navItemSubject.subscribe(() => {
            this.menuNavItemId = this.menuService.navItemId;
        });
    }

    ngOnDestroy(): void {}

    ngOnChanges(changes: SimpleChanges) {
        if (changes.item) {
            this.isEnabled = changes.item.currentValue.isEnabled;

            this.item.additionalText = (typeof changes.item.currentValue.additionalLabel === 'function')
                ? changes.item.currentValue.additionalLabel() : changes.item.currentValue.additionalLabel;
        }
    }
}
