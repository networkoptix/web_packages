import { CommonModule } from '@angular/common';
import {
    Component,
    ContentChildren,
    EventEmitter,
    Input,
    Output,
    QueryList,
    booleanAttribute,
    signal,
    AfterViewInit,
} from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { startWith } from 'rxjs';

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
    imports: [TranslateModule, CommonModule],
})
export class NxTabsComponent implements AfterViewInit {
    @Input({ transform: booleanAttribute }) animated: boolean = false;
    @Input() animationSpeed: string;
    @Input() set currentTabIndex(index: number) {
        this.currentTabIndex$$.set(index);
    }
    @Output() currentTabIndexChange = new EventEmitter<number>();

    @ContentChildren(NxBaseTabComponent, { descendants: true })
    tabItems: QueryList<NxBaseTabComponent>;

    currentTabIndex$$ = signal<number | null>(null);

    handleTabClick = (tab: NxBaseTabComponent, index: number): void => {
        const childTabs = this.tabItems.toArray();
        const currentIndex = childTabs[this.currentTabIndex$$()] ? this.currentTabIndex$$() : 0;
        childTabs[currentIndex].selected = false;
        childTabs[index].selected = true;
        this.currentTabIndex$$.set(index);
        tab.tabClick.emit(index);
        this.currentTabIndexChange.emit(index);
    };

    ngAfterViewInit(): void {
        this.tabItems.changes.pipe(startWith(this.tabItems)).subscribe(tabs => {
            const currTabIndex = this.currentTabIndex$$();
            const items = tabs.toArray();
            if (currTabIndex && items[currTabIndex]) {
                items[currTabIndex].selected = true;
            }
            this.initTabs();
        });
    }

    initTabs(): void {
        const items = this.tabItems.toArray();
        const selected = items.some(tab => tab.selected);
        if (!selected && items.length > 0) {
            this.handleTabClick(items[0], 0);
        }
    }
}
