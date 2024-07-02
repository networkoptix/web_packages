import { CommonModule } from '@angular/common';
import { Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterOutlet } from '@angular/router';
import { Store } from '@ngrx/store';
import { TranslateModule } from '@ngx-translate/core';
import { AngularSvgIconModule } from 'angular-svg-icon';
import { switchMap } from 'rxjs';

import { selectSubchannelPartner } from '@common/store/channel-partners/channel-partners.selectors';
import { NxTabsModule } from '@components/tabs/tabs.module';
import { Tab } from '@components/tabs/tabs.types';
import { NxTagComponent } from '@components/tag/tag.component';
import staticLang from '@language_static';
import { PermissionsStore } from '@pages/home/store/permissions/permissions.store';
import { PartnerRedirect } from '@pages/home/utils/redirect';
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
export class NxSubchannelComponent {
    LANG = staticLang;
    icons = icons;

    permissionStore = inject(PermissionsStore);
    tabs = computed<Tab[]>(() => {
        const tabs: Tab[] = [];
        if (this.permissionStore.canViewPartnerReports$$()) {
            tabs.push({
                displayName: this.LANG.channelPartners.tabNames.reports,
                route: 'reports',
            });
        }
        if (this.permissionStore.canViewPartnerSettings$$()) {
            tabs.push({
                displayName: this.LANG.channelPartners.tabNames.settings,
                route: 'settings',
            });
        }
        return tabs;
    });
    currentSubChannel$$ = toSignal(
        this.route.params.pipe(
            switchMap(({ subChannelId }) =>
                this.store.select(selectSubchannelPartner(subChannelId)),
            ),
        ),
    );
    constructor(
        private route: ActivatedRoute,
        private router: Router,
        private store: Store,
    ) {}

    toRoot(): Promise<boolean> {
        const id = this.currentSubChannel$$()!.parentChannelPartner;
        return this.router.navigate([PartnerRedirect.toPartnerSubChannels(id)]);
    }
}
