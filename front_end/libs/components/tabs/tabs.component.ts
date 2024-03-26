import { CommonModule } from '@angular/common';
import {
    Component,
    ContentChildren,
    Input,
    QueryList,
    booleanAttribute,
    signal,
    inject,
    computed,
} from '@angular/core';
import { RouterModule } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';

import {
    ChannelPartnersRouteState,
    DEFAULT_TAB_ID,
} from '@pages/home/store/route-state/route-state.store';
import { PipesModule } from '@pipes/pipes.module';

import { NxBaseTabComponent } from './tab/tab.component';

/*
Usage:
<nx-tabs [(currentTabIndex)]="currTabIndex">
    <nx-base-tab
        [displayName]="tab.displayName"
        (tabClick)="handleTabClick($event)"
        disabled
    >
        {{tab.displayName}}
    </nx-base-tab>
</nx-tabs>
*/

@Component({
    selector: 'nx-tabs',
    templateUrl: 'tabs.component.html',
    styleUrls: ['tabs.component.scss'],
    standalone: true,
    imports: [TranslateModule, CommonModule, RouterModule, PipesModule],
})
export class NxTabsComponent {
    @Input({ transform: booleanAttribute }) animated: boolean = false;
    @Input() animationSpeed: string;

    routeState = inject(ChannelPartnersRouteState);

    tabItemsInitial$$ = signal<QueryList<NxBaseTabComponent>>(new QueryList<NxBaseTabComponent>());

    @ContentChildren(NxBaseTabComponent, { descendants: true })
    set tabItems(tabItems: QueryList<NxBaseTabComponent>) {
        this.tabItemsInitial$$.set(tabItems);
    }

    tabItems$$ = computed(() => {
        let selectedTab = this.routeState.tabId();
        if (selectedTab === DEFAULT_TAB_ID) {
            selectedTab = '';
        }
        const tabItems = this.tabItemsInitial$$();
        return tabItems.map(tab => {
            tab.selected = tab.route === selectedTab;
            return tab;
        });
    });
}
