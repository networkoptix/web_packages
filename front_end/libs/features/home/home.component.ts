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
    selectAreChannelPartnersAndOrgsLoading,
    selectRootOrganizations,
} from '@common/store/channel-partners/channel-partners.selectors';
import { NxPreLoaderComponent } from '@components/placeholders/pre-loader/pre-loader.component';
import staticLang from '@language_static';
import { MenuNode } from '@services/menus.service.types';
import type {
    ChannelPartner,
    Organization,
} from '@services/nx-cloud-api/cloud-services/channel-partners/channel-partners-api.types';
import { NxHeaderService } from '@services/nx-header.service';
import { NxSystemsService } from '@services/systems.service';
import { NxSystemInfo } from '@services/systems.service.types';

@Component({
    selector: 'nx-home',
    templateUrl: 'home.component.html',
    imports: [NxPreLoaderComponent, RouterModule, CommonModule],
    standalone: true,
})
export class NxHomeComponent implements OnInit {
    readonly LANG = staticLang;
    areChannelPartnersAndOrgsLoading$ = this.store.select<boolean>(
        selectAreChannelPartnersAndOrgsLoading,
    );
    organizations$$ = this.store.selectSignal<Organization[]>(selectRootOrganizations);
    channelPartners$$ = this.store.selectSignal<ChannelPartner[]>(selectChannelPartners);
    isPageLoading: boolean = true;

    loadingSubscription = this.areChannelPartnersAndOrgsLoading$
        .pipe(
            takeUntilDestroyed(),
            filter(loading => !loading),
            switchMap(() => {
                const systems$ = this.systemsService.systemsSubject.pipe(
                    map((systems: NxSystemInfo[]) =>
                        systems.filter(({ organizationId }) => !organizationId),
                    ),
                    distinctUntilChanged((prev, curr) => isEqual(prev, curr)),
                );
                const homeNode$ = this.headerService.nodes$.pipe(
                    map(nodes => nodes?.find(node => node.url === '/home')),
                );
                return combineLatest([homeNode$, systems$]);
            }),
        )
        .subscribe(([homeNode, systems]) => this.initChannelPartners(homeNode, systems));

    constructor(
        private router: Router,
        private route: ActivatedRoute,
        private store: Store,
        private systemsService: NxSystemsService,
        private headerService: NxHeaderService,
    ) {}

    ngOnInit(): void {
        this.store.dispatch(CPActions.loadChannelPartnersAndOrgs());
    }

    private initChannelPartners(homeNode: MenuNode | undefined, systems: NxSystemInfo[]): void {
        const redirect = !this.route.snapshot.children[0].routeConfig?.path;
        let redirectPath = '';

        if (!homeNode) {
            return;
        }

        const organizations = this.organizations$$();
        const channelPartners = this.channelPartners$$();

        const nodes = [
            new MenuNode('', '/home'),
            ...channelPartners.map(partner => {
                return new MenuNode(partner.name, `/home/channelPartners/${partner.id}`);
            }),
            ...organizations
                .filter(org => !channelPartners.some(partner => org.channelPartner === partner.id))
                .sort((a, b) => a.name.localeCompare(b.name))
                .map(org => {
                    return new MenuNode(org.name, `/home/organization/${org.id}`);
                }),
        ];
        nodes[0].invisible = true;

        if (systems.some(sys => sys.accessRole !== 'owner')) {
            redirectPath = 'shared';
            nodes.push(
                new MenuNode(
                    this.LANG.appHeader.headerMenuNodes.channelPartners.nodes.shared.displayName,
                    '/home/shared',
                ),
            );
        }
        if (systems.some(sys => sys.accessRole === 'owner')) {
            redirectPath = 'personal';
            nodes.push(
                new MenuNode(
                    this.LANG.appHeader.headerMenuNodes.channelPartners.nodes.personal.displayName,
                    '/home/personal',
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

        if (redirectPath && this.isPageLoading) {
            this.isPageLoading = false;
        }
    }
}
