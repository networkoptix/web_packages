import { Component, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { BehaviorSubject, combineLatest, filter, map, Observable, of } from 'rxjs';

import staticLang from '@common/language/language_i18n_static.json';
import { MenuNode } from '@services/menus.service.types';
import { NxHeaderService } from '@services/nx-header.service';
import { NxSystemsService } from '@services/systems.service';

import { Organization } from './home.types';
import { NxSystemGroupsService } from './services/system-groups.service';

const getOrganizations = (): Observable<Organization[]> => {
    const mockData: Organization[] = [
        {
            orgName: 'superlong groupname for testing',
            icon: 'https://picsum.photos/100/50',
            status: 'offline',
            id: '21cbbd87-2fbb-45a3-b070-5a381eeeb554',
        },
        {
            orgName: 'add group test',
            icon: 'https://picsum.photos/100/50',
            status: 'offline',
            id: 'f88aea5b-090f-495b-a27b-e731e5115912',
        },
        {
            orgName: 'Real Machines',
            icon: 'https://picsum.photos/100/50',
            status: 'offline',
            id: '0e1bc401-7aab-48ba-b4cc-55fde5bbcd0f',
        },
        {
            orgName: 'Now Live',
            icon: 'https://picsum.photos/100/50',
            status: 'offline',
            id: '47ac2d27-298e-4d3c-857b-9e05f989b334',
        },
    ];
    return of(mockData);
};

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
        private groupsService: NxSystemGroupsService,
        private systemsService: NxSystemsService,
        private headerService: NxHeaderService,
    ) {
        this.groupsService.connect();
    }

    ngOnInit(): void {
        const systems$ = this.systemsService.systemsSubject;
        const homeNode = this.headerService.nodes$.pipe(
            filter(res => !!res),
            map(nodes => nodes.find(node => node.url === '/home')),
        );
        // Temporary until API hooked up
        const organizations$ = getOrganizations();
        const channelPartners$ = new BehaviorSubject(null);
        let redirectPath = 'personal';

        combineLatest([homeNode, channelPartners$, organizations$, systems$])
            .pipe(untilDestroyed(this))
            .subscribe(([homeNode, channelPartners, organizations, systems]) => {
                const nodes = [
                    homeNode.nodes.shift(),
                    ...organizations
                        .sort((a, b) =>
                            a.orgName.toLowerCase().localeCompare(b.orgName.toLowerCase()),
                        )
                        .map(org => {
                            return new MenuNode(
                                org.orgName,
                                `/home/organization/${org.id}/systems`,
                            );
                        }),
                ];

                if (systems.some(sys => sys.accessRole !== 'owner')) {
                    nodes.push(
                        new MenuNode(
                            this.LANG.appHeader.headerMenuNodes.systemGroups.nodes.personal.displayName,
                            '/home/personal',
                        ),
                    );
                }
                if (systems.some(sys => sys.accessRole === 'owner')) {
                    redirectPath = 'shared';
                    nodes.push(
                        new MenuNode(
                            this.LANG.appHeader.headerMenuNodes.systemGroups.nodes.shared.displayName,
                            '/home/shared',
                        ),
                    );
                }

                if (organizations) {
                    // Does not work at the moment, groupID required
                    redirectPath = 'organizations/testId';
                }
                if (channelPartners) {
                    const CPid = 'testId';
                    redirectPath = `channelPartners/${CPid}`;
                }
                homeNode.nodes = nodes;
                this.isLoading = false;
                this.router.navigateByUrl(`home/${redirectPath}`);
            });
        channelPartners$.next(true);
    }

    ngOnDestroy(): void {
        this.groupsService.disconnect();
    }
}
