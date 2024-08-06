import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { Store } from '@ngrx/store';
import { isEqual } from 'lodash';
import { combineLatest, distinctUntilChanged } from 'rxjs';
import { filter, map, switchMap } from 'rxjs/operators';

import * as CPActions from '@common/store/channel-partners/channel-partners.actions';
import {
    selectAllOrganizations,
    selectAreChannelPartnersAndOrgsLoading,
    selectChannelPartners,
} from '@common/store/channel-partners/channel-partners.selectors';
import { NxPreLoaderComponent } from '@components/placeholders/pre-loader/pre-loader.component';
import staticLang from '@language_static';
import { MenuNode } from '@services/menus.service.types';
import {
    ChannelPartner,
    ChannelPartnerRoleIds,
    Organization,
} from '@services/nx-cloud-api/cloud-services/channel-partners/channel-partners-api.types';
import { NxHeaderService } from '@services/nx-header.service';
import { NxSystemsService } from '@services/systems.service';
import { NxSystemInfo } from '@services/systems.service.types';
import { LoadingState } from '@store/channel-partners/channel-partners.state';
import { isUserSystem } from '@utils/nx';

@Component({
    selector: 'nx-home',
    templateUrl: 'home.component.html',
    styles: `
        :host {
            height: 100%;
        }
    `,
    imports: [NxPreLoaderComponent, RouterModule, CommonModule],
    standalone: true,
})
export class NxHomeComponent implements OnInit {
    readonly LANG = staticLang;
    areChannelPartnersAndOrgsLoading$ = this.store.select<LoadingState>(
        selectAreChannelPartnersAndOrgsLoading,
    );

    organizations$ = this.store.select<Organization[]>(selectAllOrganizations);
    channelPartners$ = this.store.select<ChannelPartner[]>(selectChannelPartners);
    isPageLoading: boolean = true;

    loadingSubscription = this.areChannelPartnersAndOrgsLoading$
        .pipe(
            takeUntilDestroyed(),
            filter(loadState => loadState === LoadingState.LOADED),
            switchMap(() => {
                const systems$ = this.systemsService.directAccessSystems$.pipe(
                    distinctUntilChanged((prev, curr) => isEqual(prev, curr)),
                );
                const homeNode$ = this.headerService.nodes$.pipe(
                    map(nodes => nodes?.find(node => node.url === '/home')),
                );
                return combineLatest([
                    homeNode$,
                    systems$,
                    this.organizations$,
                    this.channelPartners$,
                ]);
            }),
        )
        .subscribe(([homeNode, systems, orgs, cps]) => {
            this.initChannelPartners(homeNode, systems, orgs, cps);
        });

    constructor(
        private router: Router,
        private route: ActivatedRoute,
        private store: Store,
        private systemsService: NxSystemsService,
        private headerService: NxHeaderService,
    ) {}

    ngOnInit(): void {
        this.store.dispatch(CPActions.loadChannelPartnersAndOrgs({ includeChildOrgs: true }));
    }

    private initChannelPartners(
        homeNode: MenuNode | undefined,
        systems: NxSystemInfo[],
        organizations: Organization[],
        channelPartners: ChannelPartner[],
    ): void {
        const redirect = !this.route.snapshot.children[0].routeConfig?.path;
        let redirectPath = '';

        if (!homeNode) {
            return;
        }
        const mappedPartners = channelPartners.reduce(
            (partners, partner) => {
                partners[partner.id] = partner;
                return partners;
            },
            {} as Record<string, ChannelPartner>,
        );

        const filteredChannelPartners = channelPartners.filter(
            partner => !partner.ownRolesIds.includes(ChannelPartnerRoleIds.REPORTS_VIEWER),
        );
        const filteredOrganizations = organizations
            .filter(org => !mappedPartners[org.channelPartner])
            .sort((a, b) => a.name.localeCompare(b.name));

        const nodes = [
            new MenuNode('', '/home'),
            ...filteredChannelPartners.map(
                partner => new MenuNode(partner.name, `/home/channel-partners/${partner.id}`),
            ),
            ...filteredOrganizations.map(
                org => new MenuNode(org.name, `/home/organization/${org.id}`),
            ),
        ];
        nodes[0].invisible = true;

        const hasAccessToPartnersOrSystems = !!(
            channelPartners.length ||
            organizations.length ||
            systems.length
        );

        if (
            !hasAccessToPartnersOrSystems ||
            systems.some(sys => sys.accessRole === 'owner' && isUserSystem(sys)) ||
            (!systems.length && !filteredChannelPartners.length && !filteredOrganizations.length)
        ) {
            redirectPath = 'personal';
            nodes.push(
                new MenuNode(
                    this.LANG.appHeader.headerMenuNodes.channelPartners.nodes.personal.displayName,
                    '/home/personal',
                ),
            );
        }

        const orgSet = new Set<string>(organizations.map(org => org.id));

        if (
            systems.some(
                sys =>
                    !sys.isMine && (!('organizationId' in sys) || !orgSet.has(sys.organizationId)),
            )
        ) {
            if (redirectPath !== 'personal') {
                redirectPath = 'shared';
            }
            nodes.push(
                new MenuNode(
                    this.LANG.appHeader.headerMenuNodes.channelPartners.nodes.shared.displayName,
                    '/home/shared',
                ),
            );
        }

        if (filteredOrganizations?.length) {
            const orgId = filteredOrganizations[0].id;
            redirectPath = `organization/${orgId}`;
        }
        if (filteredChannelPartners?.length) {
            for (const partner of filteredChannelPartners) {
                if (!partner.ownRolesIds.includes(ChannelPartnerRoleIds.REPORTS_VIEWER)) {
                    redirectPath = `channel-partners/${partner.id}`;
                    break;
                }
            }
        }

        homeNode.nodes = nodes;
        // For the l2 menu to reset itself.
        this.headerService.cycleL2Menu$.next();

        if (redirect && redirectPath && this.isPageLoading) {
            this.router.navigateByUrl(`home/${redirectPath}`).then(() => {
                this.isPageLoading = false;
            });
        } else {
            this.isPageLoading = this.router.url === '/home';
        }
    }
}
