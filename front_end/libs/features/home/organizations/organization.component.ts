import { CdkDragDrop, DragDropModule } from '@angular/cdk/drag-drop';
import { CommonModule } from '@angular/common';
import {
    Component,
    DestroyRef,
    Input,
    OnInit,
    inject,
    signal,
    computed,
    input,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { UntilDestroy } from '@ngneat/until-destroy';
import { Store } from '@ngrx/store';
import { TranslateModule } from '@ngx-translate/core';
import { AngularSvgIconModule } from 'angular-svg-icon';
import { distinctUntilChanged, map } from 'rxjs';
import { delay } from 'rxjs/operators';

import { selectCurrentUser } from '@common/store/account/account.selectors';
import * as CPActions from '@common/store/channel-partners/channel-partners.actions';
import {
    selectCurrentOrganization,
    selectCurrentPartnerId,
    selectCurrentPartnerOrgs,
    selectRootOrganizations,
    selectCurrentPartner,
} from '@common/store/channel-partners/channel-partners.selectors';
import { NxPreLoaderComponent } from '@components/placeholders/pre-loader/pre-loader.component';
import { NxTabsModule } from '@components/tabs/tabs.module';
import { Tab } from '@components/tabs/tabs.types';
import { NxTagComponent } from '@components/tag/tag.component';
import { NxAddSvgSrcDirective } from '@directives/add-data.directive';
import staticLang from '@language_static';
import { Account } from '@services/account.service/account';
import { NxChannelPartnersService } from '@services/channel-partners.service';
import { NxCloudApiService } from '@services/nx-cloud-api';
import {
    GroupItem,
    Organization,
    State,
    OrgPermissions,
    OrgCardItem,
    ChannelPartnerPermissions,
} from '@services/nx-cloud-api/cloud-services/channel-partners/channel-partners-api.types';
import type { CustomAccountProperty } from '@services/nx-cloud-api/custom-account-property';
import { nxConfig } from '@services/nx-config/config';
import { icons } from '@static-variables';

import { NxSystemGroupsSidebarComponent } from '../components/sidebar/sidebar.component';
import { NxAccessTableComponent } from '../components/users/access-table/access-table.component';
import { GroupsItem, Crumb } from '../home.types';
import { GroupsStore } from '../store/groups/groups.store';

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
        NxAccessTableComponent,
        NxTagComponent,
        TranslateModule,
    ],
})
export class NxOrganizationsComponent implements OnInit {
    LANG = staticLang;
    icons = icons;
    State = State;
    tabs: Tab[] = [];
    groupsStore = inject(GroupsStore);
    currentTabRoute$$ = input.required<string>({ alias: 'currentTabRoute' });
    tabs$$ = computed(() => {
        const currOrg = this.currentOrganization$$();
        const ownPermissions = currOrg?.ownPermissions || [];
        const isChannelPartnerUser = this.isChannelPartnerUser$$();
        if (!currOrg) {
            return [];
        }
        return this.populateTabs(ownPermissions, currOrg, isChannelPartnerUser);
    });
    currentTabIndex$$ = computed(() => {
        const tabs = this.tabs$$();
        const currentTabRoute = this.currentTabRoute$$();
        if (tabs?.length) {
            for (const [index, tab] of tabs.entries()) {
                if (tab.route === currentTabRoute) {
                    return index;
                }
            }
        }
        return -1;
    });

    isLoading = true;
    userEmail: string;
    destroyRef = inject(DestroyRef);
    isChannelPartnerUser$$ = signal<boolean>(false);
    showAccessTable = false;
    accessTableUser: string = '';
    @Input() inChannelPartner: boolean = false;

    private account$$ = this.store.selectSignal<Account>(selectCurrentUser);
    organizations$$ = this.store.selectSignal<Organization[]>(selectRootOrganizations);
    currentPartnerOrganizations$$ =
        this.store.selectSignal<Organization[]>(selectCurrentPartnerOrgs);
    currentPartnerId$$ = this.store.selectSignal<string>(selectCurrentPartnerId);

    sidebarSettings: CustomAccountProperty<SidebarSettings>;
    currentGroupId$$ = computed(() => this.cpService.paramStateHandler.state$$()?.params?.groupId);
    currentOrganization$$ = this.store.selectSignal(selectCurrentOrganization);
    currentPartner$$ = this.store.selectSignal(selectCurrentPartner);
    rootGroups$$ = this.groupsStore.groupsEntities;

    constructor(
        private store: Store,
        private route: ActivatedRoute,
        private router: Router,
        private cloudApi: NxCloudApiService,
        private cpService: NxChannelPartnersService,
    ) {
        const { email } = this.account$$();
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
                map(({ params }) => params.email),
                distinctUntilChanged(),
                delay(100),
                takeUntilDestroyed(this.destroyRef),
            )
            .subscribe(email => {
                if (email) {
                    this.accessTableUser = email;
                    this.showAccessTable = true;
                } else {
                    this.showAccessTable = false;
                }
            });

        this.cpService.paramStateHandler.state$
            .pipe(
                map(({ params }) => params.organizationId),
                distinctUntilChanged(),
                takeUntilDestroyed(this.destroyRef),
            )
            .subscribe(id => {
                const orgs = this.organizations$$();
                const partnerOrgs = this.currentPartnerOrganizations$$();
                const currOrg = this.currentOrganization$$();
                if (
                    (!orgs.find(o => o.id === id) && !partnerOrgs.find(o => o.id === id)) ||
                    !currOrg
                ) {
                    return this.router.navigate(['404']);
                }

                this.cpService.getSelfChannelPartnerUser(currOrg?.channelPartner).subscribe({
                    next: () => this.isChannelPartnerUser$$.set(true),
                    error: () => {
                        this.isChannelPartnerUser$$.set(false);
                        this.isLoading = false;
                    },
                    complete: () => (this.isLoading = false),
                });
            });
    }

    populateTabs(
        ownPermissions: string[],
        currOrg: Organization,
        isChannelPartnerUser: boolean,
    ): Tab[] {
        const tabs: Tab[] = [];
        const partnerPermissions =
            (this.isChannelPartnerUser$$() && this.currentPartner$$()?.ownPermissions) || [];
        if (
            ownPermissions.includes(OrgPermissions.ACCESS_SYSTEMS) ||
            this.isChannelPartnerUser$$()
        ) {
            tabs.push({
                displayName: this.LANG.channelPartners.tabNames.systems,
                route: 'systems',
            });
        }
        if (ownPermissions.includes(OrgPermissions.MANAGE_USERS)) {
            tabs.push({
                displayName: this.LANG.channelPartners.tabNames.users,
                route: 'users',
            });
        }
        if (
            ownPermissions.includes(OrgPermissions.VIEW_SERVICE_REPORTS) &&
            nxConfig.featureFlags.channelPartnersReportsUI
        ) {
            tabs.push({
                displayName: this.LANG.channelPartners.tabNames.reports,
                route: 'reports',
            });
        }
        if (
            partnerPermissions.includes(ChannelPartnerPermissions.ALTER_STATE_ORGANIZATIONS) ||
            ownPermissions.includes(OrgPermissions.CONFIGURE_ORGANIZATION)
        ) {
            tabs.push({
                displayName: this.LANG.channelPartners.tabNames.settings,
                route: 'settings',
            });
        }

        return tabs;
    }

    public handleSidebarTogglingEarClick(): void {
        this.sidebarSettings.update(curr => {
            curr.showSidebarState = !curr.showSidebarState;
            return curr;
        }, true);
    }

    processGroups = (orgGroups: GroupItem[]): GroupItem[] => {
        const groups: GroupItem[] = [];
        const getChildren = (group: GroupItem): void => {
            for (const child of group.children) {
                child.type = OrgCardItem.GROUP;
                groups.push(child);
                getChildren(child);
            }
        };
        for (const group of orgGroups) {
            group.type = OrgCardItem.GROUP;
            groups.push(group);
            getChildren(group);
        }
        return groups;
    };

    dismiss(): void {
        this.sidebarSettings.update(curr => {
            curr.showSidebarState = false;
            return curr;
        }, true);
    }

    onTabClick(newIndex: number): void {
        const tabs = this.tabs$$();
        const currentGroupId = this.currentGroupId$$();
        const tabRoute = tabs ? tabs[newIndex].route : '';
        const route = currentGroupId ? ['group', currentGroupId, tabRoute] : [tabRoute];
        this.router.navigate(route, { relativeTo: this.route });
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
