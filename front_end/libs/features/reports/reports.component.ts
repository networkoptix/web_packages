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
import { NxAutoCompleteItemComponent } from '@components/autocomplete-v2/autocomplete-item/autocomplete-item.component';
import { NxAutocompleteV2Component } from '@components/autocomplete-v2/autocomplete-v2.component';
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
        FormsModule,
        TranslateModule,
        RouterModule,
        NxAutocompleteV2Component,
        NxAutoCompleteItemComponent,
    ],
    standalone: true,
})
export class NxReportsComponent implements OnInit {
    search = '';
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

    constructor(
        private router: Router,
        private store: Store,
        private appStateService: NxAppStateService,
    ) {}

    ngOnInit(): void {
        this.appStateService.ready = true;
    }

    selectItem(selectedItem: SearchableDropdownItem): void {
        if (selectedItem?.value) {
            const urlSegments = this.router.url.split('/');
            const [entityType, entityId] = selectedItem.value.split('/');
            this.router.navigate([
                ...urlSegments.slice(0, 2),
                entityType,
                entityId,
                'service-usage',
            ]);
        }
    }
}
