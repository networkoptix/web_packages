import { Injectable } from '@angular/core';
import { Resolve } from '@angular/router';
import { combineLatest, filter, map, Observable, of, take } from 'rxjs';

import staticLang from '@common/language/language_i18n_static.json';
import { MenuNode } from '@services/menus.service.types';
import { NxHeaderService } from '@services/nx-header.service';
import { NxSystemsService } from '@services/systems.service';

import { Organization } from './home.types';

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

@Injectable()
export class HeaderResolver implements Resolve<void> {
    LANG = staticLang.appHeader.headerMenuNodes.systemGroups;

    constructor(private headerService: NxHeaderService, private systemsService: NxSystemsService) {}
    resolve(): void {
        const homeNode = this.headerService.nodes$.pipe(
            filter(res => !!res),
            map(nodes => nodes.find(node => node.url === '/home')),
        );

        const systems$ = this.systemsService.systemsSubject;

        combineLatest([homeNode, getOrganizations(), systems$])
            .pipe(take(1))
            .subscribe(([homeNode, organizations, systems]) => {
                const nodes = [
                    homeNode.nodes.shift(),
                    ...organizations.map(org => {
                        return new MenuNode(org.orgName, `/home/organization/${org.id}/systems`);
                    }),
                ];
                if (systems.some(sys => sys.accessRole === 'owner')) {
                    nodes.push(
                        new MenuNode(this.LANG.nodes.personal.displayName, '/home/personal'),
                    );
                }
                if (systems.some(sys => sys.accessRole !== 'owner')) {
                    nodes.push(new MenuNode(this.LANG.nodes.shared.displayName, '/home/shared'));
                }
                homeNode.nodes = nodes;
            });
    }
}
