import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, signal } from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { Store } from '@ngrx/store';
import { TranslateModule } from '@ngx-translate/core';
import { take } from 'rxjs';

import { selectChannelStructure } from '@common/store/channel-partners/channel-partners.selectors';
import { NxSimpleSearchComponent } from '@components/simple-search/simple-search.component';
import { ChannelPartnersStructure } from '@services/nx-cloud-api/cloud-services/channel-partners/channel-partners-api.types';
import { NxParamStateService } from '@services/param-state/param-state.service';
import { caseInsensitiveSearch } from '@utils/general';

import { NxOrgSidebarLevelComponent } from './org-sidebar-level/org-sidebar-level.component';
import { NxPartnerSidebarLevelComponent } from './partner-sidebar-level/partner-sidebar-level.component';
import { FormattedChannelStructure, FormattedPartnerStructure } from './reports-sidebar.types';

@UntilDestroy()
@Component({
    selector: 'nx-reports-sidebar',
    templateUrl: './reports-sidebar.component.html',
    styleUrls: ['./reports-sidebar.component.scss'],
    imports: [
        CommonModule,
        FormsModule,
        TranslateModule,
        RouterModule,
        NxPartnerSidebarLevelComponent,
        NxOrgSidebarLevelComponent,
        NxSimpleSearchComponent,
    ],
    standalone: true,
})
export class NxReportsSidebarComponent implements OnInit {
    channelStructure$$ = this.store.selectSignal<ChannelPartnersStructure | undefined>(
        selectChannelStructure,
    );
    channelStructure$ = toObservable(this.channelStructure$$);
    openLevels$$ = signal<Set<string>>(new Set<string>());
    // Use paramStateService since the :entityId url param is nested below the activated route for this component
    entityId$$ = this.paramStateService.getStateHandler(({ params }) => params.entityId).state$$;
    search$$ = signal<string>('');

    formattedChannelStructure$$ = computed<FormattedChannelStructure>(() => {
        // Add a reference to the parent partner for child partners/orgs, so that we can open the parent when
        // a child is selected while searching
        const channelStructure = this.channelStructure$$();
        const partnersWithParentReference =
            channelStructure?.channelPartners.map(partner => {
                const subChannels = partner.subChannels.map(subChannel => ({
                    ...subChannel,
                    parentPartner: partner.id,
                    // for now a subchannel shouldn't have additional children
                    subChannels: [],
                    organizations: [],
                }));
                const organizations = partner.organizations.map(org => ({
                    ...org,
                    parentPartner: partner.id,
                }));
                return { ...partner, subChannels, organizations, parentPartner: null };
            }) ?? [];
        const organizationsWithParentReference =
            channelStructure?.organizations.map(org => ({ ...org, parentPartner: null })) ?? [];
        return {
            channelPartners: partnersWithParentReference,
            organizations: organizationsWithParentReference,
        };
    });
    searchFilteredChannelStructure$$ = computed<FormattedChannelStructure>(() => {
        const search = this.search$$();
        const formattedChannelStructure = this.formattedChannelStructure$$();

        if (!search) {
            return formattedChannelStructure;
        }

        // Only incude root partners, child partners, and child orgs that match the search
        // If a root partner matches the search but none if its children do, then none of the children will be shown
        // If a child partner or child org matches the search, it will be shown along with its parent partner
        const filteredPartners =
            formattedChannelStructure?.channelPartners.reduce((filteredPartners, partner) => {
                const partnerNameMatches = caseInsensitiveSearch(partner.name, search);

                const filteredSubChannels = partner.subChannels.filter(subChannel =>
                    caseInsensitiveSearch(subChannel.name, search),
                );
                const filteredOrgs = partner.organizations.filter(org =>
                    caseInsensitiveSearch(org.name, search),
                );
                if (filteredSubChannels.length || filteredOrgs.length) {
                    filteredPartners.push({
                        ...partner,
                        subChannels: filteredSubChannels,
                        organizations: filteredOrgs,
                    });
                } else if (partnerNameMatches) {
                    filteredPartners.push({ ...partner, subChannels: [], organizations: [] });
                }

                return filteredPartners;
            }, [] as FormattedPartnerStructure[]) ?? [];
        const filteredOrgs =
            formattedChannelStructure?.organizations.filter(org =>
                caseInsensitiveSearch(org.name, search),
            ) ?? [];

        return {
            channelPartners: filteredPartners,
            organizations: filteredOrgs,
        };
    });

    constructor(
        private paramStateService: NxParamStateService,
        private router: Router,
        private store: Store,
    ) {}

    ngOnInit(): void {
        // Set the default open partner on load:
        // - if a root partner is selected, it is open if it has children
        // - if a nested partner/org is selected, its parent partner is open
        this.channelStructure$.pipe(take(1), untilDestroyed(this)).subscribe(channelStructure => {
            const selectedEntityId = this.router.url.split('/')[3];
            const entityToDefaultOpenPartnerMap: { [key: string]: string | null } = {};
            channelStructure?.channelPartners.forEach(rootPartner => {
                const hasChildren =
                    rootPartner.subChannels.length > 0 || rootPartner.organizations.length > 0;
                entityToDefaultOpenPartnerMap[rootPartner.id] = hasChildren ? rootPartner.id : null;

                rootPartner.subChannels.forEach(subChannel => {
                    entityToDefaultOpenPartnerMap[subChannel.id] = rootPartner.id;
                });
                rootPartner.organizations.forEach(org => {
                    entityToDefaultOpenPartnerMap[org.id] = rootPartner.id;
                });
            });
            channelStructure?.organizations.forEach(rootOrg => {
                entityToDefaultOpenPartnerMap[rootOrg.id] = null;
            });

            const defaultOpenPartners = entityToDefaultOpenPartnerMap[selectedEntityId]
                ? [entityToDefaultOpenPartnerMap[selectedEntityId] as string]
                : [];
            this.openLevels$$.set(new Set(defaultOpenPartners));
        });
    }

    toggleOpen(entityId: string): void {
        this.openLevels$$.update(openLevels => {
            const newOpenLevels = new Set(openLevels);
            if (newOpenLevels.has(entityId)) {
                newOpenLevels.delete(entityId);
            } else {
                newOpenLevels.add(entityId);
            }
            return newOpenLevels;
        });
    }
    open(entityId: string): void {
        if (this.openLevels$$().has(entityId)) {
            return;
        }
        this.openLevels$$.update(openLevels => new Set(openLevels).add(entityId));
    }
}
