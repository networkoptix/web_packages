import { CdkDragDrop } from '@angular/cdk/drag-drop';
import { CommonModule, NgClass, NgIf } from '@angular/common';
import { Component, Input, OnInit } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { Store } from '@ngrx/store';
import { AngularSvgIconModule } from 'angular-svg-icon';

import { selectCurrentUser } from '@common/store/account/account.selectors';
import { NxPreLoaderComponent } from '@components/placeholders/pre-loader/pre-loader.component';
import { NxTabsDirective } from '@components/tabs/tabs.directive';
import { Tab, TabEmit } from '@components/tabs/tabs.types';
import { NxAddSvgSrcDirective } from '@directives/add-data.directive';
import staticLang from '@language_static';
import { Account } from '@services/account.service/account';
import { NxCloudApiService } from '@services/nx-cloud-api';
import { Organization } from '@services/nx-cloud-api/cloud-services/channel-partners/channel-partners-api.types';
import type { CustomAccountProperty } from '@services/nx-cloud-api/custom-account-property';
import { nxConfig } from '@services/nx-config/config';
import { IConfig } from '@services/nx-config/config-types';
import { icons } from '@static-variables';

import { NxTabsComponent } from '../../../components/tabs/tabs.component';
import { NxGroupsCardsComponent } from '../components/groups-cards/groups-cards.component';
import { NxSystemGroupsSidebarComponent } from '../components/sidebar/sidebar.component';
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
    standalone: true,
    imports: [
        RouterModule,
        NxPreLoaderComponent,
        CommonModule,
        AngularSvgIconModule,
        NgClass,
        NgIf,
        NxSystemGroupsSidebarComponent,
        NxGroupsCardsComponent,
        NxTabsComponent,
        NxTabsDirective,
        NxAddSvgSrcDirective,
    ],
    providers: [NxSystemGroupsService],
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

    currentTab: Tab;
    isLoading = true;
    userEmail: string;
    @Input() inChannelPartner: boolean;
    @Input() isAdmin: boolean;
    @Input() currentTabRoute: string;

    account = this.store.selectSignal<Account>(selectCurrentUser);
    organizations$$ = this.store.selectSignal<Organization[]>(selectRootOrganizations);
    currentPartnerOrganizations$$ =
        this.store.selectSignal<Organization[]>(selectCurrentPartnerOrgs);
    currentPartnerId = this.store.selectSignal<string>(selectCurrentPartnerId);

    openGroups$ = this.store.select<OpenGroups>(selectOpenGroups);
    currentPath$ = this.store.select<GroupPath[]>(selectCurrentPath);
    sidebarSettings: CustomAccountProperty<SidebarSettings>;
    hasGroups$ = this.store.select<boolean>(selectHasGroups);
    currentGroupId$ = this.store.select<string>(selectCurrentGroupId);
    currentOrganization$ = this.store.select(selectCurrentOrganization);
    rootGroup$ = this.store.select<Crumb>(selectCurrentRootGroup);

    constructor(
        private store: Store,
        private route: ActivatedRoute,
        private router: Router,
        private cloudApi: NxCloudApiService,
        private groupsService: NxSystemGroupsService,
    ) {
        const { email } = this.account();
        this.userEmail = email;
        this.sidebarSettings = this.cloudApi.customAccountPropertyFactory(
            'showSidebarState',
            email,
            { showSidebarState: true },
        );
    }

    ngOnInit(): void {
        this.groupsService.connect();
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
        this.currentTab = this.tabs.find(tab => tab.route === this.currentTabRoute);
        this.route.params.pipe(untilDestroyed(this)).subscribe(({ id }) => {
            this.groupsService.getGroups(id);
            this.store.dispatch(CPActions.setCurrentOrgId({ currentOrgId: id }));
            const orgs = this.organizations$$();
            const partnerOrgs = this.currentPartnerOrganizations$$();
            if (!orgs.find(o => o.id === id) && !partnerOrgs.find(o => o.id === id)) {
                this.router.navigate(['404']);
            }
            this.isLoading = false;
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
        this.router.navigate(['home', 'channelPartners', this.currentPartnerId()]);
    }
}
