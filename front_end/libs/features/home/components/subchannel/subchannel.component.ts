import { CommonModule } from '@angular/common';
import { Component, Input, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterOutlet } from '@angular/router';
import { Store } from '@ngrx/store';
import { TranslateModule } from '@ngx-translate/core';
import { AngularSvgIconModule } from 'angular-svg-icon';
import { switchMap } from 'rxjs';

import {
    selectCurrentPartner,
    selectSubchannelPartner,
} from '@common/store/channel-partners/channel-partners.selectors';
import { NxTabsModule } from '@components/tabs/tabs.module';
import { Tab } from '@components/tabs/tabs.types';
import { NxTagComponent } from '@components/tag/tag.component';
import staticLang from '@language_static';
import { ChannelPartnerPermissions } from '@services/nx-cloud-api/cloud-services/channel-partners/channel-partners-api.types';
import { icons } from '@variables/static-variables';

@Component({
    selector: 'nx-subchannel',
    templateUrl: 'subchannel.component.html',
    styleUrls: ['subchannel.component.scss'],
    standalone: true,
    imports: [
        RouterOutlet,
        CommonModule,
        NxTabsModule,
        AngularSvgIconModule,
        NxTagComponent,
        TranslateModule,
    ],
})
export class NxSubchannelComponent implements OnInit {
    LANG = staticLang;
    icons = icons;

    inSubChannel = this.route.params;
    currentPartner$$ = this.store.selectSignal(selectCurrentPartner);
    currentTabIndex$$ = signal(0);
    tabs: Tab[] = [
        {
            displayName: this.LANG.channelPartners.tabNames.information,
            route: '',
        },
    ];

    @Input() currentTabRoute: string;
    currentSubchannel$ = this.route.params.pipe(
        switchMap(({ subchannelId }) => this.store.select(selectSubchannelPartner(subchannelId))),
    );
    constructor(
        private route: ActivatedRoute,
        private router: Router,
        private store: Store,
    ) {}

    ngOnInit(): void {
        const { ownPermissions } = this.currentPartner$$();
        if (ownPermissions.includes(ChannelPartnerPermissions.ALTER_STATE_SUB_CHANNEL_PARTNERS)) {
            this.tabs.push({
                displayName: this.LANG.channelPartners.tabNames.settings,
                route: 'settings',
            });
        }
        if (ownPermissions.includes(ChannelPartnerPermissions.MANAGE_USERS)) {
            this.tabs.push({
                displayName: this.LANG.channelPartners.tabNames.users,
                route: 'users',
            });
        }
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
