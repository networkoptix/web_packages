import { CommonModule } from '@angular/common';
import {
    Component,
    ContentChildren,
    EventEmitter,
    Input,
    OnInit,
    Output,
    QueryList,
    booleanAttribute,
} from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';

import { NxBaseTabComponent } from './tab/tab.component';

const tabWidth = 10;

/*
Usage:
<nx-tabs (animated OR animationSpeed="2s") [(currentTabIndex)]="currTabIndex">
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
export class NxTabsComponent implements OnInit {
    @Input({ transform: booleanAttribute }) animated: boolean = false;
    @Input() animationSpeed: string;
    @Input() currentTabIndex: number = 0;
    @Output() currentTabIndexChange = new EventEmitter<number>();
    @ContentChildren(NxBaseTabComponent, { descendants: true })
    tabItems: QueryList<NxBaseTabComponent>;
    currTabTranslate = 0;

    ngOnInit(): void {
        this.currTabTranslate = this.currentTabIndex * tabWidth;
    }

    handleTabClick = (tab: NxBaseTabComponent, index: number): void => {
        const childTabs = this.tabItems.toArray();
        childTabs[this.currentTabIndex].selected = false;
        childTabs[index].selected = true;
        this.currentTabIndex = index;
        this.currTabTranslate = this.currentTabIndex * tabWidth;
        tab.tabClick.emit(index);
        this.currentTabIndexChange.emit(index);
    };
}
