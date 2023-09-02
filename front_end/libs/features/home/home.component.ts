import { NgIf } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { Store } from '@ngrx/store';
import { isEqual } from 'lodash';
import { combineLatest, distinctUntilChanged, map } from 'rxjs';

import { NxPreLoaderComponent } from '@components/placeholders/pre-loader/pre-loader.component';
import staticLang from '@language_static';
import { MenuNode } from '@services/menus.service.types';
import { NxHeaderService } from '@services/nx-header.service';
import { NxSystemsService } from '@services/systems.service';

import { NxChannelPartnersService } from './services/channel-partners.service';
import * as CPActions from './store/channel-partners/channel-partners.actions';
import {
    selectChannelPartners,
    selectRootOrganizations,
} from './store/channel-partners/channel-partners.selectors';

@UntilDestroy()
@Component({
    selector: 'nx-home',
    templateUrl: 'home.component.html',
    imports: [NxPreLoaderComponent, RouterModule, NgIf],
    standalone: true,
})
export class NxHomeComponent implements OnInit {
    readonly LANG = staticLang;
    isLoading: boolean = true;

    constructor(
        private router: Router,
        private route: ActivatedRoute,
        private store: Store,
        private systemsService: NxSystemsService,
        private headerService: NxHeaderService,
        private CPService: NxChannelPartnersService,
    ) {
        this.initChannelPartners();
    }

    ngOnInit(): void {
        const redirect = !this.route.snapshot.children[0].routeConfig.path;
        const systems$ = this.systemsService.systemsSubject.pipe(
            distinctUntilChanged((prev, curr) => isEqual(prev, curr)),
        );
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
                if (redirect && this.isLoading) {
                    this.router.navigateByUrl(`home/${redirectPath}`);
                }
                this.isLoading = false;
            });
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
