import { CdkDragDrop, DragDropModule } from '@angular/cdk/drag-drop';
import { CommonModule } from '@angular/common';
import { Component, DestroyRef, Input, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { UntilDestroy } from '@ngneat/until-destroy';
import { Store } from '@ngrx/store';
import { AngularSvgIconModule } from 'angular-svg-icon';
import { distinctUntilChanged, firstValueFrom, map } from 'rxjs';

import { selectCurrentUser } from '@common/store/account/account.selectors';
import { NxPreLoaderComponent } from '@components/placeholders/pre-loader/pre-loader.component';
import { NxTabsModule } from '@components/tabs/tabs.module';
import { Tab } from '@components/tabs/tabs.types';
import { NxAddSvgSrcDirective } from '@directives/add-data.directive';
import staticLang from '@language_static';
import { Account } from '@services/account.service/account';
import { NxCloudApiService } from '@services/nx-cloud-api';
import {
    GroupItem,
    Organization,
    State,
    OrgPermissions,
} from '@services/nx-cloud-api/cloud-services/channel-partners/channel-partners-api.types';
import type { CustomAccountProperty } from '@services/nx-cloud-api/custom-account-property';
import { nxConfig } from '@services/nx-config/config';
import { icons } from '@static-variables';

import { NxSystemGroupsSidebarComponent } from '../components/sidebar/sidebar.component';
import { GroupsItem, Crumb, OpenGroups } from '../home.types';
import { NxChannelPartnersService } from '../services/channel-partners.service';
import * as CPActions from '../store/channel-partners/channel-partners.actions';
import {
    selectCurrentOrgId,
    selectCurrentOrganization,
    selectCurrentPartnerId,
    selectCurrentPartnerOrgs,
    selectRootOrganizations,
} from '../store/channel-partners/channel-partners.selectors';
import * as groupActions from '../store/groups/groups.actions';
import {
    selectCurrentGroupId,
    selectHasGroups,
    selectOpenGroups,
} from '../store/groups/groups.selectors';

import { NxOrganizationCardContainerComponent } from './cards-container/org-cards-container.component';

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
        NxSystemGroupsSidebarComponent,
        NxOrganizationCardContainerComponent,
        NxAddSvgSrcDirective,
        DragDropModule,
        NxTabsModule,
    ],
})
export class NxOrganizationsComponent implements OnInit {
    LANG = staticLang;
    icons = icons;
    State = State;
    tabs: Tab[] = [];

    currentTabIndex$$ = signal(0);
    isLoading = true;
    userEmail: string;
    destroyRef = inject(DestroyRef);
    isChannelPartnerUser$$ = signal<boolean | undefined>(undefined);
    @Input() inChannelPartner: boolean;
    @Input() currentTabRoute: string;

    account = this.store.selectSignal<Account>(selectCurrentUser);
    organizations$$ = this.store.selectSignal<Organization[]>(selectRootOrganizations);
    currentPartnerOrganizations$$ =
        this.store.selectSignal<Organization[]>(selectCurrentPartnerOrgs);
    currentPartnerId$$ = this.store.selectSignal<string>(selectCurrentPartnerId);
    currentOrgId$$ = this.store.selectSignal<string>(selectCurrentOrgId);

    openGroups$ = this.store.select<OpenGroups>(selectOpenGroups);
    sidebarSettings: CustomAccountProperty<SidebarSettings>;
    hasGroups$ = this.store.select<boolean>(selectHasGroups);
    currentGroupId$$ = this.store.selectSignal<string>(selectCurrentGroupId);
    currentOrganization$$ = this.store.selectSignal(selectCurrentOrganization);

    constructor(
        private store: Store,
        private route: ActivatedRoute,
        private router: Router,
        private cloudApi: NxCloudApiService,
        private cpService: NxChannelPartnersService,
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
        if (!this.inChannelPartner) {
            this.store.dispatch(CPActions.setCurrentPartnerId({ currentPartnerId: null }));
        }

        this.cpService.paramStateHandler.state$
            .pipe(
                map(({ params }) => params.organizationId),
                distinctUntilChanged(),
                takeUntilDestroyed(this.destroyRef),
            )
            .subscribe(async id => {
                this.tabs = [];
                const orgs = this.organizations$$();
                const partnerOrgs = this.currentPartnerOrganizations$$();
                if (!orgs.find(o => o.id === id) && !partnerOrgs.find(o => o.id === id)) {
                    return this.router.navigate(['404']);
                }
                this.store.dispatch(CPActions.setCurrentOrgId({ currentOrgId: id }));
                const currOrg = this.currentOrganization$$();
                const { ownPermissions } = currOrg;
                await firstValueFrom(
                    this.cpService.getSelfChannelPartnerUser(currOrg?.channelPartner),
                )
                    .then(() => this.isChannelPartnerUser$$.set(true))
                    .catch(() => this.isChannelPartnerUser$$.set(false));
                if (
                    ownPermissions.includes(OrgPermissions.ACCESS_SYSTEMS) ||
                    this.isChannelPartnerUser$$()
                ) {
                    this.tabs.push({
                        displayName: this.LANG.channelPartners.tabNames.systems,
                        route: 'systems',
                    });
                }
                if (ownPermissions.includes(OrgPermissions.MANAGE_USERS)) {
                    this.tabs.push({
                        displayName: this.LANG.channelPartners.tabNames.users,
                        route: 'users',
                    });
                }
                if (
                    ownPermissions.includes(OrgPermissions.VIEW_SERVICE_REPORTS) &&
                    nxConfig.featureFlags.channelPartnersReports
                ) {
                    this.tabs.push({
                        displayName: this.LANG.channelPartners.tabNames.reports,
                        route: 'reports',
                    });
                }
                if (ownPermissions.includes(OrgPermissions.CONFIGURE_ORGANIZATION)) {
                    this.tabs.push({
                        displayName: this.LANG.channelPartners.tabNames.settings,
                        route: 'settings',
                    });
                }
                for (const [index, tab] of this.tabs.entries()) {
                    if (tab.route === this.currentTabRoute) {
                        this.currentTabIndex$$.set(index);
                        break;
                    }
                }
                this.isLoading = false;
            });

        this.cpService.getOrgGroups(this.currentOrgId$$()).subscribe(groups => {
            this.store.dispatch(
                groupActions.setGroups({ groupsMap: groups, groups: this.flattenGroups(groups) }),
            );
        });
    }

    public handleSidebarTogglingEarClick(): void {
        this.sidebarSettings.update(curr => {
            curr.showSidebarState = !curr.showSidebarState;
            return curr;
        }, true);
    }

    flattenGroups = (orgGroups: GroupItem[]): GroupItem[] => {
        const res: GroupItem[] = [];
        const getChildren = (group: GroupItem): void => {
            for (const child of group.children) {
                res.push(child);
                getChildren(child);
            }
        };
        for (const group of orgGroups) {
            res.push(group);
            getChildren(group);
        }
        return res;
    };

    dismiss(): void {
        this.sidebarSettings.update(curr => {
            curr.showSidebarState = false;
            return curr;
        }, true);
    }

    onTabClick(newIndex: number): void {
        const currentGroupId = this.currentGroupId$$();
        const tabRoute = this.tabs[newIndex].route;
        const route = currentGroupId ? ['group', currentGroupId, tabRoute] : [tabRoute];
        this.router
            .navigate(route, { relativeTo: this.route })
            .then(() => this.currentTabIndex$$.set(newIndex));
    }

    trackItem(_index: number, item: Crumb): string {
        return item.id;
    }

    moveToRoot(event: CdkDragDrop<GroupsItem, GroupsItem, GroupsItem>): void {
        // Placeholder function
    }

    __crash(): void {
        // Placeholder function
    }

    toRoot(): void {
        this.router.navigate(['home', 'channelPartners', this.currentPartnerId$$()]);
    }
}
