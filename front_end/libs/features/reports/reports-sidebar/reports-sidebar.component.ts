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
import {
    ChannelPartnersStructure,
    OrganizationStructure,
    PartnerStructure,
} from '@services/nx-cloud-api/cloud-services/channel-partners/channel-partners-api.types';
import { NxParamStateService } from '@services/param-state/param-state.service';
import { caseInsensitiveSearch } from '@utils/general';

import { NxOrgSidebarLevelComponent } from './org-sidebar-level/org-sidebar-level.component';
import { NxPartnerSidebarLevelComponent } from './partner-sidebar-level/partner-sidebar-level.component';

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

    private entityIdToEntityMap: Map<string, PartnerStructure | OrganizationStructure> = new Map();
    private childToParentMap: Map<string, string | null> = new Map();
    parentMap$$ = signal<ReadonlyMap<string, string | null>>(new Map());

    private buildPathToRoot(entityId: string): string[] {
        const { childToParentMap } = this;
        const visitedNodes: string[] = [entityId];

        // Start from the selected entity and traverse up to the root partner.
        let current = childToParentMap.get(entityId);
        // For safety, limit the number of iterations to 1 million.
        for (let i = 0; current && i < 1_000_000; i++) {
            visitedNodes.push(current);
            current = childToParentMap.get(current);
        }
        return visitedNodes;
    }

    searchFilteredChannelStructure$$ = computed<ChannelPartnersStructure>(() => {
        const search = this.search$$();
        const channelStructure = this.channelStructure$$();

        if (!search || !channelStructure) {
            return channelStructure || { channelPartners: [], organizations: [] };
        }
        /* How search works
            1. Add every match and their parents.
            2. Remove the roots children that don't match.
            3. Recursively removing sub channels and orgs that don't match.
        * */
        // Step 1: Mark all nodes that match the search query and their parents to the root.
        const matches = Array.from(this.entityIdToEntityMap.entries()).reduce(
            (matchingNodes, [key, node]) => {
                if (caseInsensitiveSearch(node.name, search)) {
                    this.buildPathToRoot(key).forEach(entityId => matchingNodes.add(entityId));
                }
                return matchingNodes;
            },
            new Set<string>(),
        );

        // Step 2: Remove top level partners and orgs that don't match the search query before we recursively filter the tree.
        const partners = channelStructure.channelPartners.filter(partner =>
            matches.has(partner.id),
        );
        const organizations = channelStructure.organizations.filter(org => matches.has(org.id));

        // Step 3: Method to filter out partners and organizations that don't match the search query.
        const filterSubChannels = (node: PartnerStructure): PartnerStructure => {
            const filteredNode = { ...node };
            if (node.subChannels.length) {
                filteredNode.subChannels = node.subChannels
                    .filter(partner => matches.has(partner.id))
                    .map(sub => filterSubChannels(sub));
            }
            filteredNode.organizations = node.organizations.filter(org => matches.has(org.id));
            return filteredNode;
        };

        return {
            organizations,
            channelPartners: partners.map(filterSubChannels),
        };
    });

    constructor(
        private paramStateService: NxParamStateService,
        private router: Router,
        private store: Store,
    ) {}

    private buildTree(tree: ChannelPartnersStructure): void {
        // Maps data at each node.
        const entityIdToEntityMap = new Map<string, PartnerStructure | OrganizationStructure>();
        // The tree represented as a map of child -> parent.
        const childToParentMap = new Map<string, string | null>();
        const traverseTree = (node: PartnerStructure): void => {
            node.organizations.forEach(org => {
                entityIdToEntityMap.set(org.id, org);
                childToParentMap.set(org.id, node.id);
            });
            node.subChannels.forEach(channelPartner => {
                entityIdToEntityMap.set(channelPartner.id, channelPartner);
                childToParentMap.set(channelPartner.id, node.id);
                traverseTree(channelPartner);
            });
        };

        // Add the root nodes to the maps.
        tree.channelPartners.forEach(partner => {
            entityIdToEntityMap.set(partner.id, partner);
            childToParentMap.set(partner.id, null);
        });
        tree.organizations.forEach(org => {
            entityIdToEntityMap.set(org.id, org);
            childToParentMap.set(org.id, null);
        });

        // Add the nested nodes to the maps.
        tree.channelPartners.map(traverseTree);
        this.childToParentMap = childToParentMap;
        this.entityIdToEntityMap = entityIdToEntityMap;
        const parentMap: ReadonlyMap<string, string | null> = childToParentMap;
        this.parentMap$$.set(parentMap);
    }

    ngOnInit(): void {
        // Set the default open partner / organization on load.
        this.channelStructure$.pipe(take(1), untilDestroyed(this)).subscribe(channelStructure => {
            const selectedEntityId = this.router.url.split('/')[3];

            this.buildTree(channelStructure!);

            const defaultOpenPartner = new Set(this.buildPathToRoot(selectedEntityId));
            this.openLevels$$.set(defaultOpenPartner);
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
        const defaultOpenPartner = new Set(this.openLevels$$());
        this.buildPathToRoot(entityId).forEach(entityId => defaultOpenPartner.add(entityId));
        this.openLevels$$.set(defaultOpenPartner);
    }
}
