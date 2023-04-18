import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { Store } from '@ngrx/store';
import { map, Observable } from 'rxjs';

import { LoadingState, Organization } from '../home.types';
import { NxSystemGroupsService } from '../services/system-groups.service';
import { selectLoadingState, selectRootGroupItems } from '../store/groups.selectors';

const getRandomInt = (max: number): number => {
    return Math.floor(Math.random() * max);
};
const statusOptions = ['online', 'suspended', 'offline', 'paused'];

@UntilDestroy()
@Component({
    selector: 'nx-channel-partners',
    templateUrl: 'channel-partners.component.html',
    styleUrls: [
        'channel-partners.component.scss',
        '../components/groups-cards/groups-cards.component.scss',
    ],
})
export class NxChannelPartnersComponent implements OnInit, OnDestroy {
    LoadingState = LoadingState;
    inOrganization: boolean;
    loadingState$ = this.store.select<LoadingState>(selectLoadingState);
    // Todo: Temporary mock data
    channelPartners$: Observable<Organization[]> = this.store.select(selectRootGroupItems).pipe(
        // eslint-disable-next-line ngrx/avoid-mapping-selectors
        map(groups => {
            if (!groups) {
                return;
            }
            return groups.map(group => {
                return {
                    orgName: group.name,
                    icon: 'https://picsum.photos/100/50',
                    status: statusOptions[getRandomInt(3)],
                    id: group.id,
                };
            });
        }),
    );
    isAdmin: boolean = false;
    currentTab: string;
    tabs = ['organizations', 'subchannel', 'information', 'users', 'settings'];

    constructor(
        private store: Store,
        private groupsService: NxSystemGroupsService,
        private router: Router,
        private route: ActivatedRoute,
    ) {
        this.groupsService.connect();
    }

    ngOnInit(): void {
        this.route.url.pipe(untilDestroyed(this)).subscribe(_ => {
            this.currentTab = this.route.snapshot.children[0].routeConfig.path;
            this.inOrganization = this.route.snapshot.children[0].url[0]?.path === 'organization';
        });
    }

    ngOnDestroy(): void {
        this.groupsService.disconnect();
    }

    newOrgDialog(): void {
        // temporary placeholder
    }

    onTabClick(tab: string): void {
        tab === 'organizations'
            ? this.router.navigate(['home', 'channelPartners', 'testId'])
            : this.router.navigate(['home', 'channelPartners', 'testId', tab]);
    }

    handleOrgClick(id: string): void {
        this.inOrganization = true;
        this.router.navigate(['organization', id, 'systems'], { relativeTo: this.route });
    }
}
