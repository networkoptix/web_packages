import { CommonModule } from '@angular/common';
import {
    Component,
    ContentChildren,
    EventEmitter,
    Input,
    OnInit,
    Output,
    QueryList,
} from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';

import { NxTabsDirective } from './tabs.directive';
import { Tab, TabEmit } from './tabs.types';

@Component({
    selector: 'nx-tabs',
    templateUrl: 'tabs.component.html',
    styleUrls: ['tabs.component.scss'],
    standalone: true,
    imports: [TranslateModule, CommonModule],
})
export class NxTabsComponent implements OnInit {
    @Input() onLoadTab: Tab;
    @Output() tabClick = new EventEmitter<TabEmit>();
    @ContentChildren(NxTabsDirective)
    tabs: QueryList<NxTabsDirective>;
    selectedTab: string;

    ngOnInit(): void {
        this.selectedTab = this.onLoadTab.displayName;
    }

    handleClick(tab: NxTabsDirective, index: number): void {
        this.selectedTab = tab.data.displayName;
        const response: TabEmit = {
            route: tab.data.route,
            index,
        };
        this.tabClick.emit(response);
    }
}
