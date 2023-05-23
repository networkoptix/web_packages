import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { Store } from '@ngrx/store';
import { catchError, of, withLatestFrom } from 'rxjs';

import { Tab, TabEmit } from '@components/tabs/tabs.types';
import { NxDialogsService } from '@dialogs/dialogs.service';
import {
    ChannelPartner,
    Organization,
} from '@services/nx-cloud-api/cloud-services/channel-partners/channel-partners-api.types';

import { NxChannelPartnersService } from '../services/channel-partners.service';
import * as CPActions from '../store/channel-partners/channel-partners.actions';
import {
    selectChannelPartners,
    selectCurrentPartner,
    selectCurrentPartnerOrgs,
} from '../store/channel-partners/channel-partners.selectors';

@UntilDestroy()
@Component({
    selector: 'nx-channel-partners',
    templateUrl: 'channel-partners.component.html',
    styleUrls: [
        'channel-partners.component.scss',
        '../components/groups-cards/groups-cards.component.scss',
        '../components/system-card/system-card.component.scss',
    ],
})
export class NxChannelPartnersComponent implements OnInit {
    isLoading = true;
    currentPartnerId: string;
    currentPartnerOrgs: Organization[];
    routeData$ = this.route.data;
    channelPartners$ = this.store.select<ChannelPartner[]>(selectChannelPartners);
    channelPartner$ = this.store.select<ChannelPartner>(selectCurrentPartner);
    organizations$ = this.store.select<Organization[]>(selectCurrentPartnerOrgs);
    isAdmin: boolean = true;
    currentTab: Tab;
    tabs: Tab[] = [
        {
            displayName: 'Organizations',
            route: '',
        },
        {
            displayName: 'Subchannel',
            route: 'subchannel',
        },
        {
            displayName: 'Information',
            route: 'information',
        },
        {
            displayName: 'Users',
            route: 'users',
        },
        {
            displayName: 'Settings',
            route: 'settings',
        },
    ];
    defaultImage = 'https://picsum.photos/100/50';

    constructor(
        private store: Store,
        private router: Router,
        private route: ActivatedRoute,
        private CPService: NxChannelPartnersService,
        private dialogsService: NxDialogsService,
    ) {}

    ngOnInit(): void {
        this.currentTab = this.tabs.find(tab => tab.route === this.route.snapshot.data.currentTab);
        this.route.params
            .pipe(untilDestroyed(this), withLatestFrom(this.channelPartners$))
            .subscribe(([{ id }, partners]) => {
                this.currentPartnerId = id;
                if (!partners.find(p => p.id === this.currentPartnerId)) {
                    this.router.navigate(['404']);
                }
                this.CPService.getPartnerOrganizations(id)
                    .pipe(catchError(err => of(err)))
                    .subscribe({
                        next: orgs => {
                            this.isLoading = false;
                            this.currentPartnerOrgs = orgs;
                            this.store.dispatch(
                                CPActions.setCurrentPartner({
                                    currentPartnerId: this.currentPartnerId,
                                    currentPartnerOrganizations: orgs,
                                }),
                            );
                        },
                        error: () => {
                            this.router.navigate(['404']);
                        },
                    });
            });
    }

    newOrgDialog(): void {
        this.dialogsService.createOrganization(this.currentPartnerId).then((org: Organization) =>
            this.store.dispatch(
                CPActions.setCurrentPartner({
                    currentPartnerId: this.currentPartnerId,
                    currentPartnerOrganizations: [...this.currentPartnerOrgs, org],
                }),
            ),
        );
    }

    onTabClick(tab: TabEmit): void {
        this.currentTab = this.tabs[tab.index];
        tab.route
            ? this.router.navigate(['home', 'channelPartners', this.currentPartnerId, tab.route])
            : this.router.navigate(['home', 'channelPartners', this.currentPartnerId]);
    }

    handleOrgClick(id: string): void {
        this.router.navigate(['organization', id, 'systems'], { relativeTo: this.route });
    }
}
