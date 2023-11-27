import { CommonModule } from '@angular/common';
import { Component, Input, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterOutlet } from '@angular/router';
import { Store } from '@ngrx/store';
import { switchMap } from 'rxjs';

import { NxTabsModule } from '@components/tabs/tabs.module';
import { Tab } from '@components/tabs/tabs.types';
import staticLang from '@language_static';
import { selectSubchannelPartner } from '@pages/home/store/channel-partners/channel-partners.selectors';

@Component({
    selector: 'nx-subchannel',
    templateUrl: 'subchannel.component.html',
    styleUrls: ['subchannel.component.scss'],
    standalone: true,
    imports: [RouterOutlet, CommonModule, NxTabsModule],
})
export class NxSubchannelComponent implements OnInit {
    LANG = staticLang;

    inSubChannel = this.route.params;
    currentTabIndex$$ = signal(0);
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
        for (const [index, tab] of this.tabs.entries()) {
            if (tab.route === this.currentTabRoute) {
                this.currentTabIndex$$.set(index);
                break;
            }
        }
    }

    toRoot(): void {
        this.router.navigate(['../'], { relativeTo: this.route });
    }

    onTabClick(newIndex: number): void {
        const newTab = this.tabs[newIndex];
        const route = newTab.route ? [newTab.route] : ['./'];
        this.router
            .navigate(route, { relativeTo: this.route })
            .then(() => this.currentTabIndex$$.set(newIndex));
    }
}
