import { Component, computed, effect, inject, input, untracked } from '@angular/core';
import { Store } from '@ngrx/store';
import { TranslateModule } from '@ngx-translate/core';

import { NxPreLoaderComponent } from '@components/placeholders/pre-loader/pre-loader.component';
import {
    ChannelPartner,
    Organization,
} from '@services/nx-cloud-api/cloud-services/channel-partners/channel-partners-api.types';
import {
    selectChannelPartners,
    selectOrganizations,
} from '@store/channel-partners/channel-partners.selectors';

import { ServiceChangesStore } from './service-changes.store';
import { EntityType } from './service-changes.types';
import { NxServiceChangesTableComponent } from './services-changes-table/service-changes-table.component';

@Component({
    selector: 'nx-service-changes',
    templateUrl: './service-changes.component.html',
    styleUrl: './service-changes.component.scss',
    imports: [TranslateModule, NxServiceChangesTableComponent, NxPreLoaderComponent],
    providers: [ServiceChangesStore],
    standalone: true,
})
export class NxServiceChangesComponent {
    readonly serviceChangesStore = inject(ServiceChangesStore);
    private readonly store = inject(Store);

    private entityType$$ = input.required<EntityType>({ alias: 'entityType' });
    private entityId$$ = input.required<string>({ alias: 'entityId' });
    private channelPartners$$ = this.store.selectSignal<ChannelPartner[]>(selectChannelPartners);
    private organizations$$ = this.store.selectSignal<Organization[]>(selectOrganizations);
    selectedEntityName$$ = computed(() => {
        const entityId = this.entityId$$();
        const channelPartners = this.channelPartners$$();
        const organizations = this.organizations$$();

        const entityName =
            channelPartners.find(({ id }) => id === entityId)?.name ||
            organizations.find(({ id }) => id === entityId)?.name ||
            '';
        return entityName;
    });

    loadServiceChangesEffect = effect(() => {
        const entityType = this.entityType$$();
        const entityId = this.entityId$$();

        const startTs = '';
        const endTs = '';
        untracked(() => {
            if (entityType === EntityType.channelPartner) {
                this.serviceChangesStore.loadPartnerServiceChanges(entityId, startTs, endTs);
            } else {
                this.serviceChangesStore.loadOrgServiceChanges(entityId, startTs, endTs);
            }
        });
    });
}
