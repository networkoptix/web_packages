import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { switchMap } from 'rxjs';

import { Tab, TabEmit } from '@components/tabs/tabs.types';
import { selectSubchannelPartner } from '@pages/home/store/channel-partners/channel-partners.selectors';

@Component({
    selector: 'nx-subchannel',
    templateUrl: 'subchannel.component.html',
    styleUrls: ['subchannel.component.scss'],
})
export class NxSubchannelComponent implements OnInit {
    inSubChannel = this.route.params;
    currentTab: Tab;
    tabs: Tab[] = [
        {
            displayName: 'Information',
            route: '',
        },
        {
            displayName: 'Settings',
            route: 'settings',
        },
    ];
    currentSubchannel$ = this.route.params.pipe(
        switchMap(({ subchannelId }) => this.store.select(selectSubchannelPartner(subchannelId))),
    );
    constructor(private route: ActivatedRoute, private router: Router, private store: Store) {}

    ngOnInit(): void {
        this.currentTab = this.tabs.find(tab => tab.route === this.route.snapshot.data.currentTab);
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
