import { AsyncPipe, NgFor } from '@angular/common';
import { Component, Input, OnInit } from '@angular/core';
import { ActivatedRoute, Router, RouterOutlet } from '@angular/router';
import { Store } from '@ngrx/store';
import { switchMap } from 'rxjs';

import staticLang from '@common/language/language_i18n_static.json';
import { NxTabsComponent } from '@components/tabs/tabs.component';
import { Tab, TabEmit } from '@components/tabs/tabs.types';
import { selectSubchannelPartner } from '@pages/home/store/channel-partners/channel-partners.selectors';

@Component({
    selector: 'nx-subchannel',
    templateUrl: 'subchannel.component.html',
    styleUrls: ['subchannel.component.scss'],
    standalone: true,
    imports: [RouterOutlet, AsyncPipe, NgFor, NxTabsComponent],
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
        tab.route
            ? this.router.navigate([tab.route], { relativeTo: this.route })
            : this.router.navigate(['./'], { relativeTo: this.route });
    }
}
