import { CommonModule } from '@angular/common';
import { Component, inject, Input, OnInit } from '@angular/core';
import { ActivatedRoute, Router, RouterOutlet } from '@angular/router';
import { Store } from '@ngrx/store';
import { TranslateModule } from '@ngx-translate/core';
import { AngularSvgIconModule } from 'angular-svg-icon';
import { switchMap } from 'rxjs';

import {
    selectCurrentPartnerParent,
    selectSubchannelPartner,
} from '@common/store/channel-partners/channel-partners.selectors';
import { NxTabsModule } from '@components/tabs/tabs.module';
import { Tab } from '@components/tabs/tabs.types';
import { NxTagComponent } from '@components/tag/tag.component';
import staticLang from '@language_static';
import { PermissionsStore } from '@pages/home/store/permissions/permissions.store';
import { PartnerRedirect } from '@pages/home/utils/redirect';
import { ChannelPartner } from '@services/nx-cloud-api/cloud-services/channel-partners/channel-partners-api.types';
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

    permissionStore = inject(PermissionsStore);
    tabs: Tab[] = [
        // We may use the 'information' tab in the future
        // {
        //     displayName: this.LANG.channelPartners.tabNames.information,
        //     route: '',
        // },
    ];

    @Input() currentTabRoute: string;
    currentSubchannel$ = this.route.params.pipe(
        switchMap(({ subchannelId }) => this.store.select(selectSubchannelPartner(subchannelId))),
    );
    currentParent$$ = this.store.selectSignal<ChannelPartner>(selectCurrentPartnerParent);
    constructor(
        private route: ActivatedRoute,
        private router: Router,
        private store: Store,
    ) {}

    ngOnInit(): void {
        if (this.permissionStore.canViewPartnerSettings$$()) {
            this.tabs.push({
                displayName: this.LANG.channelPartners.tabNames.settings,
                route: 'settings',
            });
        }
    }

    toRoot(): Promise<boolean> {
        const id = this.currentParent$$().id;
        return this.router.navigate([PartnerRedirect.toPartnerSubChannels(id)]);
    }
}
