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

@Component({
    selector: 'nx-tabs',
    templateUrl: 'tabs.component.html',
    styleUrls: ['tabs.component.scss'],
})
export class NxTabsComponent implements AfterViewInit {
    @Input() onLoadTab: string;
    @Output() tabClick = new EventEmitter<string>();
    @ContentChildren(NxTabsDirective)
    tabs: QueryList<NxTabsDirective>;
    tabsMap: string[] = [];

    currentTabTemplate: TemplateRef<unknown>;
    currentTabIndex: number = 0;

    ngAfterViewInit(): void {
        this.tabs.forEach((tab, index) => {
            this.tabsMap[index] = tab.name;
        });
        this.currentTabTemplate = this.onLoadTab
            ? this.tabs.find((tab, index) => {
                  this.currentTabIndex = index;
                  return tab.name === this.onLoadTab;
              }).template
            : this.tabs.first.template;
    }

    handleClick(tab: NxTabsDirective, index: number): void {
        this.currentTabTemplate = tab.template;
        this.currentTabIndex = index;
        this.tabClick.emit(tab.name);
    }
}
