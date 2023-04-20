import {
    AfterViewInit,
    Component,
    ContentChildren,
    EventEmitter,
    Input,
    Output,
    QueryList,
    TemplateRef,
} from '@angular/core';

import { NxTabsDirective } from './tabs.directive';
import { Tab, TabEmit } from './tabs.types';

@Component({
    selector: 'nx-tabs',
    templateUrl: 'tabs.component.html',
    styleUrls: ['tabs.component.scss'],
})
export class NxTabsComponent implements AfterViewInit {
    @Input() onLoadTab: Tab;
    @Output() tabClick = new EventEmitter<TabEmit>();
    @ContentChildren(NxTabsDirective)
    tabs: QueryList<NxTabsDirective>;
    tabsMap: string[] = [];

    currentTabTemplate: TemplateRef<unknown>;
    currentTabIndex: number = 0;

    ngAfterViewInit(): void {
        this.tabs.forEach((tab, index) => {
            this.tabsMap[index] = tab.data.displayName;
        });
        this.currentTabTemplate = this.onLoadTab
            ? this.tabs.find((tab, index) => {
                  this.currentTabIndex = index;
                  return tab.data.displayName === this.onLoadTab.displayName;
              }).template
            : this.tabs.first.template;
    }

    handleClick(tab: NxTabsDirective, index: number): void {
        this.currentTabTemplate = tab.template;
        this.currentTabIndex = index;
        const data: TabEmit = {
            route: tab.data.route,
            index,
        };
        this.tabClick.emit(data);
    }
}
