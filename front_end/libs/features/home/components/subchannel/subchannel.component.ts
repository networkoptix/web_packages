import { CommonModule } from '@angular/common';
import { Component, Input, OnInit } from '@angular/core';
import { ActivatedRoute, Router, RouterOutlet } from '@angular/router';
import { Store } from '@ngrx/store';
import { switchMap } from 'rxjs';

import { NxTabsComponent } from '@components/tabs/tabs.component';
import { NxTabsDirective } from '@components/tabs/tabs.directive';
import { Tab, TabEmit } from '@components/tabs/tabs.types';
import staticLang from '@language_static';
import { selectSubchannelPartner } from '@pages/home/store/channel-partners/channel-partners.selectors';

@Component({
    selector: 'nx-subchannel',
    templateUrl: 'subchannel.component.html',
    styleUrls: ['subchannel.component.scss'],
    standalone: true,
    imports: [RouterOutlet, CommonModule, NxTabsComponent, NxTabsDirective],
})
export class NxSubchannelComponent implements OnInit {
    LANG = staticLang;

    inSubChannel = this.route.params;
    currentTab: Tab;
    tabs: Tab[] = [
        {
            displayName: this.LANG.channelPartners.tabNames.information,
            route: '',
        },
        {
            displayName: this.LANG.channelPartners.tabNames.settings,
            route: 'settings',
        },
        {
            displayName: this.LANG.channelPartners.tabNames.users,
            route: 'users',
        },
    ];

    @Input() currentTabRoute: string;
    currentSubchannel$ = this.route.params.pipe(
        switchMap(({ subchannelId }) => this.store.select(selectSubchannelPartner(subchannelId))),
    );
    constructor(private route: ActivatedRoute, private router: Router, private store: Store) {}

    ngOnInit(): void {
        this.currentTab = this.tabs.find(tab => tab.route === this.currentTabRoute);
    }

    toRoot(): void {
        this.router.navigate(['../'], { relativeTo: this.route });
    }

    onTabClick(tab: TabEmit): void {
        this.currentTab = this.tabs[tab.index];
        if (tab.route) {
            this.router.navigate([tab.route], { relativeTo: this.route });
        } else {
            this.router.navigate(['./'], { relativeTo: this.route });
        }
    }
}
