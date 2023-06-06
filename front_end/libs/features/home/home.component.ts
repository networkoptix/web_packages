import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { Store } from '@ngrx/store';
import { combineLatest, map } from 'rxjs';

import staticLang from '@common/language/language_i18n_static.json';
import { MenuNode } from '@services/menus.service.types';
import { NxHeaderService } from '@services/nx-header.service';
import { NxSystemsService } from '@services/systems.service';

import { NxChannelPartnersService } from './services/channel-partners.service';
import { NxSystemGroupsService } from './services/system-groups.service';
import * as CPActions from './store/channel-partners/channel-partners.actions';
import {
    selectChannelPartners,
    selectRootOrganizations,
} from './store/channel-partners/channel-partners.selectors';

@UntilDestroy()
@Component({
    selector: 'nx-home',
    templateUrl: 'home.component.html',
})
export class NxHomeComponent implements OnInit, OnDestroy {
    readonly LANG = staticLang;
    isLoading: boolean = true;

    constructor(
        private router: Router,
        private route: ActivatedRoute,
        private store: Store,
        private groupsService: NxSystemGroupsService,
        private systemsService: NxSystemsService,
        private headerService: NxHeaderService,
        private CPService: NxChannelPartnersService,
    ) {
        this.groupsService.connect();
        this.initChannelPartners();
    }

    ngOnInit(): void {
        const redirect = !this.route.snapshot.children[0].routeConfig.path;
        const systems$ = this.systemsService.systemsSubject;
        const homeNode = this.headerService.nodes$.pipe(
            map(nodes => nodes.find(node => node.url === '/home')),
        );
        const organizations$ = this.store.select(selectRootOrganizations);
        const channelPartners$ = this.store.select(selectChannelPartners);
        let redirectPath = 'personal';

        combineLatest([homeNode, channelPartners$, organizations$, systems$])
            .pipe(untilDestroyed(this))
            .subscribe(([homeNode, channelPartners, organizations, systems]) => {
                if (!homeNode) {
                    return;
                }
                const nodes = [
                    new MenuNode('', '/home'),
                    ...channelPartners.map(partner => {
                        return new MenuNode(partner.name, `/home/channelPartners/${partner.id}`);
                    }),
                    ...organizations
                        .filter(org =>
                            channelPartners.some(partner => org.channelPartner !== partner.id),
                        )
                        .sort((a, b) => a.name.localeCompare(b.name))
                        .map(org => {
                            return new MenuNode(org.name, `/home/organization/${org.id}/systems`);
                        }),
                ];
                nodes[0].invisible = true;

                if (systems.some(sys => sys.accessRole !== 'owner')) {
                    redirectPath = 'shared';
                    nodes.push(
                        new MenuNode(
                            this.LANG.appHeader.headerMenuNodes.systemGroups.nodes.shared.displayName,
                            '/home/shared',
                        ),
                    );
                }
                if (systems.some(sys => sys.accessRole === 'owner')) {
                    nodes.push(
                        new MenuNode(
                            this.LANG.appHeader.headerMenuNodes.systemGroups.nodes.personal.displayName,
                            '/home/personal',
                        ),
                    );
                }

                if (organizations.length) {
                    // Does not work at the moment, groupID required
                    redirectPath = 'organizations/testId';
                }
                if (channelPartners.length) {
                    const CPid = channelPartners[0].id;
                    redirectPath = `channelPartners/${CPid}`;
                }
                homeNode.nodes = nodes;
                this.isLoading = false;
                if (redirect) {
                    this.router.navigateByUrl(`home/${redirectPath}`);
                }
            });
    }

    ngOnDestroy(): void {
        this.groupsService.disconnect();
    }

    initChannelPartners(): void {
        this.CPService.getChannelPartners().subscribe(partners =>
            this.store.dispatch(CPActions.setChannelPartners({ channelPartners: partners })),
        );
        this.CPService.getOrganizations().subscribe(orgs =>
            this.store.dispatch(CPActions.setOrganizations({ rootOrganizations: orgs })),
        );
    }
}
