import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, input } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { Store } from '@ngrx/store';
import { TranslateModule } from '@ngx-translate/core';

import {
    selectChannelPartners,
    selectOrganizations,
} from '@common/store/channel-partners/channel-partners.selectors';
import { NxSearchableDropdown } from '@components/dropdowns/searchable/searchable.component';
import type { SearchableDropdownItem } from '@components/dropdowns/searchable/searchable.component.types';
import { NxPreLoaderComponent } from '@components/placeholders/pre-loader/pre-loader.component';
import { NxAppStateService } from '@services/nx-app-state.service';
import type {
    ChannelPartner,
    Organization,
} from '@services/nx-cloud-api/cloud-services/channel-partners/channel-partners-api.types';

@Component({
    selector: 'nx-reports',
    templateUrl: 'reports.component.html',
    styleUrl: 'reports.component.scss',
    imports: [
        CommonModule,
        NxPreLoaderComponent,
        NxSearchableDropdown,
        FormsModule,
        TranslateModule,
        RouterModule,
    ],
    standalone: true,
})
export class NxReportsComponent implements OnInit {
    channelPartners$$ = this.store.selectSignal<ChannelPartner[]>(selectChannelPartners);
    organizations$$ = this.store.selectSignal<Organization[]>(selectOrganizations);

    dropdownItems$$ = computed<SearchableDropdownItem[]>(() => {
        const channelPartners = this.channelPartners$$();
        const organizations = this.organizations$$();
        const items = [
            ...channelPartners.map(({ id, name }) => ({ name, value: `channel-partner/${id}` })),
            ...organizations.map(({ id, name: orgName }) => ({
                name: '[org] ' + orgName,
                value: `organization/${id}`,
            })),
        ];
        return items;
    });
    selectedEntityId$$ = input.required({ alias: 'entityId' });
    selectedItem$$ = computed<SearchableDropdownItem | false>(() => {
        const items = this.dropdownItems$$();
        const selectedEntityId = this.selectedEntityId$$();
        return items.find(({ value }) => value === selectedEntityId) || false;
    });

    constructor(
        private router: Router,
        private store: Store,
        private appStateService: NxAppStateService,
    ) {}

    ngOnInit(): void {
        this.appStateService.ready = true;
    }

    selectItem(selectedItem: SearchableDropdownItem): void {
        if (selectedItem.value) {
            const urlSegments = this.router.url.split('/');
            const [entityType, entityId] = selectedItem.value.split('/');
            urlSegments.splice(2, 2, entityType, entityId);
            this.router.navigate(urlSegments);
        }
    }
}
