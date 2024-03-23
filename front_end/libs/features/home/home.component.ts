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
    selectChannelPartners,
    selectRootOrganizations,
    selectAreChannelPartnersAndOrgsLoading,
} from '@common/store/channel-partners/channel-partners.selectors';
import { NxNoSystemsComponent } from '@components/no-systems/no-systems.component';
import { NxPreLoaderComponent } from '@components/placeholders/pre-loader/pre-loader.component';
import staticLang from '@language_static';
import { MenuNode } from '@services/menus.service.types';
import { PartnerRoles } from '@services/nx-cloud-api/cloud-services/channel-partners/channel-partners-api.types';
import type {
    ChannelPartner,
    Organization,
} from '@services/nx-cloud-api/cloud-services/channel-partners/channel-partners-api.types';
import { NxHeaderService } from '@services/nx-header.service';
import { NxSystemsService } from '@services/systems.service';
import { NxSystemInfo } from '@services/systems.service.types';
import { LoadingState } from '@store/channel-partners/channel-partners.state';

@Component({
    selector: 'nx-home',
    templateUrl: 'home.component.html',
    styles: `
        :host {
            height: 100%;
        }
    `,
    imports: [NxPreLoaderComponent, RouterModule, CommonModule, NxNoSystemsComponent],
    standalone: true,
})
export class NxHomeComponent implements OnInit {
    readonly LANG = staticLang;
    areChannelPartnersAndOrgsLoading$ = this.store.select<LoadingState>(
        selectAreChannelPartnersAndOrgsLoading,
    );

    organizations$$ = this.store.select<Organization[]>(selectRootOrganizations);
    channelPartners$$ = this.store.select<ChannelPartner[]>(selectChannelPartners);
    isPageLoading: boolean = true;
    isNoSystemsOrgOrChP: boolean = false;

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
                    this.organizations$$,
                    this.channelPartners$$,
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
        this.store.dispatch(CPActions.loadChannelPartnersAndOrgs({ includeChildOrgs: false }));
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

        const filteredChannelPartners = channelPartners.filter(
            partner => !partner.ownPermissions.includes(PartnerRoles.field_access_cp_accountant),
        );
        const filteredOrganizations = organizations
            .filter(org => !channelPartners.some(partner => org.channelPartner === partner.id))
            .sort((a, b) => a.name.localeCompare(b.name));

        const nodes = [
            new MenuNode('', '/home'),
            ...filteredChannelPartners.map(
                partner => new MenuNode(partner.name, `/home/channelPartners/${partner.id}`),
            ),
            ...filteredOrganizations.map(
                org => new MenuNode(org.name, `/home/organization/${org.id}`),
            ),
        ];
        nodes[0].invisible = true;

        if (systems.some(sys => sys.accessRole === 'owner')) {
            redirectPath = 'personal';
            nodes.push(
                new MenuNode(
                    this.LANG.appHeader.headerMenuNodes.channelPartners.nodes.personal.displayName,
                    '/home/personal',
                ),
            );
        }

        if (systems.some(sys => sys.accessRole !== 'owner')) {
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

        if (organizations?.length) {
            const orgId = organizations[0].id;
            redirectPath = `organization/${orgId}`;
        }
        if (channelPartners?.length) {
            const CPid = channelPartners[0].id;
            redirectPath = `channelPartners/${CPid}`;
        }
        homeNode.nodes = nodes;
        if (redirect && redirectPath && this.isPageLoading) {
            this.router.navigateByUrl(`home/${redirectPath}`);
        }

        if (!redirectPath) {
            this.isNoSystemsOrgOrChP = true;
        }
        this.isPageLoading = false;
    }
}
