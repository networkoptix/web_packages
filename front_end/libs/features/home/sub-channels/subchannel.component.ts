import { CommonModule } from '@angular/common';
import { Component, computed, inject, OnDestroy } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterOutlet } from '@angular/router';
import { Store } from '@ngrx/store';
import { TranslateModule } from '@ngx-translate/core';
import { AngularSvgIconModule } from 'angular-svg-icon';

import { selectCurrentSubChannel } from '@common/store/channel-partners/channel-partners.selectors';
import { NxTabsComponent } from '@components/tabs/tabs.component';
import { Tab } from '@components/tabs/tabs.types';
import { NxTagComponent } from '@components/tag/tag.component';
import staticLang from '@language_static';
import { PermissionsStore } from '@pages/home/store/permissions/permissions.store';
import { PartnerRedirect } from '@pages/home/utils/redirect';
import { State } from '@services/nx-cloud-api/cloud-services/channel-partners/channel-partners-api.types';
import * as CPActions from '@store/channel-partners/channel-partners.actions';
import { icons } from '@variables/static-variables';

@Component({
    selector: 'nx-subchannel',
    templateUrl: 'subchannel.component.html',
    styleUrls: ['subchannel.component.scss'],
    standalone: true,
    imports: [
        RouterOutlet,
        CommonModule,
        AngularSvgIconModule,
        NxTagComponent,
        NxTabsComponent,
        TranslateModule,
    ],
})
export class NxSubchannelComponent implements OnDestroy {
    LANG = staticLang;
    icons = icons;
    State = State;

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
    currentSubChannel = computed(() => this.store.selectSignal(selectCurrentSubChannel)()!);
    effectiveState = computed(() => this.currentSubChannel().effectiveState);

    constructor(
        route: ActivatedRoute,
        private router: Router,
        private store: Store,
    ) {
        route.params.pipe(takeUntilDestroyed()).subscribe(params => {
            store.dispatch(CPActions.setCurrentSubChannelId({ id: params.subChannelId }));
        });
    }

    ngOnDestroy(): void {
        this.store.dispatch(CPActions.setCurrentSubChannelId({ id: null }));
    }

    toRoot(): Promise<boolean> {
        const id = this.currentSubChannel().parentChannelPartner;
        return this.router.navigate([PartnerRedirect.toPartnerSubChannels(id)]);
    }
}
