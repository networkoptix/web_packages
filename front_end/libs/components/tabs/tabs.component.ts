import { Component, EventEmitter, Input, OnChanges, OnInit, Output } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

import { NgChanges } from '@utils/ng-changes';

@Component({
    selector: 'nx-tabs',
    templateUrl: 'tabs.component.html',
    styleUrls: ['tabs.component.scss'],
})
export class NxTabsComponent implements OnInit, OnChanges {
    @Input() tabs: string[];
    @Input() currentTab: string;
    @Output() tabClick = new EventEmitter<string>();
    currentTab$ = new BehaviorSubject<string>(null);

    ngOnInit(): void {
        this.currentTab$.next(this.currentTab);
    }

    // Update seleted tab based on input
    ngOnChanges({ currentTab }: NgChanges<NxTabsComponent>): void {
        this.currentTab$.next(currentTab.currentValue);
    }

    handleClick(tab: string): void {
        this.currentTab$.next(tab);
        this.tabClick.emit(tab);
    }
}
