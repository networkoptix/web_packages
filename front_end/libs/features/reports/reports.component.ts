import { CommonModule } from '@angular/common';
import { Component, OnInit, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { Store } from '@ngrx/store';
import { TranslateModule } from '@ngx-translate/core';

import {
    selectChannelPartners,
    selectOrganizations,
} from '@common/store/channel-partners/channel-partners.selectors';
import { NxPreLoaderComponent } from '@components/placeholders/pre-loader/pre-loader.component';
import { NxThemeAttributeDirective } from '@directives/theme-attribute.directive';
import { NxAppStateService } from '@services/nx-app-state.service';
import type {
    ChannelPartner,
    Organization,
} from '@services/nx-cloud-api/cloud-services/channel-partners/channel-partners-api.types';

import { NxReportsSidebarComponent } from './reports-sidebar/reports-sidebar.component';

interface Item {
    name: string;
    value: string;
    prefix?: string;
}

@Component({
    selector: 'nx-reports',
    templateUrl: 'reports.component.html',
    styleUrls: ['reports.component.scss'],
    imports: [
        CommonModule,
        NxPreLoaderComponent,
        FormsModule,
        TranslateModule,
        RouterModule,
        NxReportsSidebarComponent,
    ],
    hostDirectives: [NxThemeAttributeDirective],
    standalone: true,
})
export class NxReportsComponent implements OnInit {
    search = '';
    channelPartners$$ = this.store.selectSignal<ChannelPartner[]>(selectChannelPartners);
    organizations$$ = this.store.selectSignal<Organization[]>(selectOrganizations);

    dropdownItems$$ = computed<Item[]>(() => {
        const channelPartners = this.channelPartners$$();
        const organizations = this.organizations$$();
        const items = [
            ...channelPartners.map(({ id, name }) => ({ name, value: `channel-partner/${id}` })),
            ...organizations.map(({ id, name }) => ({
                name,
                value: `organization/${id}`,
                prefix: '[org] ',
            })),
        ];
        return items;
    });

    constructor(
        private router: Router,
        private store: Store,
        private appStateService: NxAppStateService,
    ) {}

    ngOnInit(): void {
        this.appStateService.ready = true;
    }

    selectItem(selectedItem: Item | undefined): void {
        if (selectedItem) {
            const urlSegments = this.router.url.split('/');
            const [entityType, entityId] = selectedItem.value.split('/');
            this.router.navigate([
                ...urlSegments.slice(0, 2),
                entityType,
                entityId,
                'service-changes',
            ]);
        }
    }
}
