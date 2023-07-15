import { CdkDragDrop } from '@angular/cdk/drag-drop';
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { Store } from '@ngrx/store';
import { combineLatest, take } from 'rxjs';

import staticLang from '@common/language/language_i18n_static.json';
import { selectCurrentUser } from '@common/store/account/account.selectors';
import { Tab, TabEmit } from '@components/tabs/tabs.types';
import { icons } from '@lib/variables/static-variables';
import { Account } from '@services/account.service/account';
import { NxCloudApiService } from '@services/nx-cloud-api';
import type { CustomAccountProperty } from '@services/nx-cloud-api/custom-account-property';
import { nxConfig } from '@services/nx-config/config';
import { IConfig } from '@services/nx-config/config-types';

import { GroupsItem, Crumb, OpenGroups, GroupPath } from '../home.types';
import { NxSystemGroupsService } from '../services/system-groups.service';
import * as CPActions from '../store/channel-partners/channel-partners.actions';
import {
    selectCurrentOrganization,
    selectCurrentPartnerId,
    selectCurrentPartnerOrgs,
    selectRootOrganizations,
} from '../store/channel-partners/channel-partners.selectors';
import {
    selectCurrentGroupId,
    selectCurrentPath,
    selectCurrentRootGroup,
    selectHasGroups,
    selectOpenGroups,
} from '../store/groups/groups.selectors';

interface SidebarSettings {
    showSidebarState: boolean;
}

@UntilDestroy()
@Component({
    selector: 'nx-organization',
    templateUrl: 'organization.component.html',
    styleUrls: ['organization.component.scss'],
})
export class NxOrganizationsComponent implements OnInit {
    LANG = staticLang;
    CONFIG: IConfig = nxConfig;
    icons = icons;
    tabs: Tab[] = [
        {
            displayName: this.LANG.channelPartners.tabNames.systems,
            route: 'systems',
        },
    ];

    userEmail: string;
    currentTab: Tab;
    isLoading = true;
    inChannelPartner = this.route.snapshot.data.inChannelPartner;
    isAdmin = this.route.snapshot.data.isAdmin;

    openGroups$ = this.store.select<OpenGroups>(selectOpenGroups);
    currentPath$ = this.store.select<GroupPath[]>(selectCurrentPath);
    sidebarSettings: CustomAccountProperty<SidebarSettings>;
    hasGroups$ = this.store.select<boolean>(selectHasGroups);
    currentGroupId$ = this.store.select<string>(selectCurrentGroupId);
    currentOrganization$ = this.store.select(selectCurrentOrganization);
    currentPartnerOrganizations$ = this.store.select(selectCurrentPartnerOrgs);
    organizations$ = this.store.select(selectRootOrganizations);
    rootGroup$ = this.store.select<Crumb>(selectCurrentRootGroup);

    constructor(
        private store: Store,
        private groupsService: NxSystemGroupsService,
        private route: ActivatedRoute,
        private router: Router,
        private cloudApi: NxCloudApiService,
    ) {}

    ngOnInit(): void {
        if (!this.inChannelPartner) {
            this.store.dispatch(CPActions.setCurrentPartnerId({ currentPartnerId: null }));
        }
        if (this.isAdmin) {
            const adminTabs = [
                {
                    displayName: this.LANG.channelPartners.tabNames.users,
                    route: 'users',
                },
                ...(this.CONFIG.featureFlags.channelPartnersReports
                    ? [
                          {
                              displayName: this.LANG.channelPartners.tabNames.reports,
                              route: 'reports',
                          },
                      ]
                    : []),
                {
                    displayName: this.LANG.channelPartners.tabNames.settings,
                    route: 'settings',
                },
            ];
            this.tabs.push(...adminTabs);
        }
        this.currentTab = this.tabs.find(tab => tab.route === this.route.snapshot.data.currentTab);
        this.route.params.pipe(untilDestroyed(this)).subscribe(({ id }) => {
            this.groupsService.getGroups(id);
            this.store.dispatch(CPActions.setCurrentOrgId({ currentOrgId: id }));
            combineLatest([this.organizations$, this.currentPartnerOrganizations$])
                .pipe(take(1))
                .subscribe(([orgs, partnerOrgs]) => {
                    if (!orgs.find(o => o.id === id) && !partnerOrgs.find(o => o.id === id)) {
                        this.router.navigate(['404']);
                    }
                });
            this.isLoading = false;
        });

        this.store
            .select<Account>(selectCurrentUser)
            .pipe(take(1))
            .subscribe(({ email }) => {
                this.userEmail = email;
                this.sidebarSettings = this.cloudApi.customAccountPropertyFactory(
                    'showSidebarState',
                    email,
                    { showSidebarState: true },
                );
            });
    }

    public handleSidebarTogglingEarClick(): void {
        this.sidebarSettings.update(curr => {
            curr.showSidebarState = !curr.showSidebarState;
            return curr;
        }, true);
    }

    dismiss(): void {
        this.sidebarSettings.update(curr => {
            curr.showSidebarState = false;
            return curr;
        }, true);
    }

    onTabClick(tab: TabEmit): void {
        this.currentTab = this.tabs[tab.index];
        this.router.navigate([tab.route], { relativeTo: this.route });
    }

    trackItem(_index: number, item: Crumb): string {
        return item.id;
    }

    moveToRoot(event: CdkDragDrop<GroupsItem, GroupsItem, GroupsItem>): void {
        this.groupsService.onDrop(event.item.data, null);
    }

    __crash(): void {
        // @ts-expect-error Deliberately crash the backend for testing
        this.groupsService.moveGroup(['foo'], ['bar']);
    }

    toRoot(): void {
        this.store
            .select(selectCurrentPartnerId)
            .pipe(take(1))
            .subscribe(id => {
                this.router.navigate(['home', 'channelPartners', id]);
            });
    }
}
