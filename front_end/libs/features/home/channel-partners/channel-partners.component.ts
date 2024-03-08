import { CdkMenuModule } from '@angular/cdk/menu';
import { CommonModule } from '@angular/common';
import { Component, OnInit, DestroyRef, inject, computed, input } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { Store } from '@ngrx/store';
import { TranslateModule } from '@ngx-translate/core';
import { AngularSvgIconModule } from 'angular-svg-icon';
import {
    Observable,
    Subject,
    combineLatestWith,
    debounceTime,
    distinctUntilChanged,
    map,
    throwError,
} from 'rxjs';

import * as CPActions from '@common/store/channel-partners/channel-partners.actions';
import {
    selectChannelPartners,
    selectCurrentPartner,
    selectCurrentPartnerOrgs,
    selectArePartnerOrgsLoading,
} from '@common/store/channel-partners/channel-partners.selectors';
import { NxPreLoaderComponent } from '@components/placeholders/pre-loader/pre-loader.component';
import { NxSearchComponent } from '@components/search/search.component';
import { NxTabsModule } from '@components/tabs/tabs.module';
import { Tab } from '@components/tabs/tabs.types';
import { NxTagComponent } from '@components/tag/tag.component';
import { NxDialogsService } from '@dialogs/dialogs.service';
import { NxAddSvgSrcDirective } from '@directives/add-data.directive';
import staticLang from '@language_static';
import { NxChannelPartnersService } from '@services/channel-partners.service';
import {
    ChannelPartner,
    Organization,
    ChannelPartnerPermissions,
    ChannelPartnerRoles,
} from '@services/nx-cloud-api/cloud-services/channel-partners/channel-partners-api.types';
import { caseInsenstiveSearch } from '@utils/general';
import { search as searchConfig, icons } from '@variables/static-variables';

import { NxCardComponent } from '../components/card/card.component';

@Component({
    selector: 'nx-channel-partners',
    templateUrl: 'channel-partners.component.html',
    styleUrls: [
        'channel-partners.component.scss',
        '../organizations/cards-container/org-cards-container.component.scss',
    ],
    standalone: true,
    imports: [
        NxSearchComponent,
        NxPreLoaderComponent,
        CommonModule,
        FormsModule,
        TranslateModule,
        RouterModule,
        CdkMenuModule,
        AngularSvgIconModule,
        NxCardComponent,
        NxTabsModule,
        NxAddSvgSrcDirective,
        NxTagComponent,
    ],
})
export class NxChannelPartnersComponent implements OnInit {
    icons = icons;
    LANG = staticLang;

    isLoading$$ = this.store.selectSignal<boolean>(selectArePartnerOrgsLoading);
    routeData$ = this.route.data;
    canCreateOrganizations$$ = computed(() => {
        const currPartner = this.currentPartner$$();
        return currPartner?.ownPermissions?.includes(
            ChannelPartnerPermissions.ADD_REMOVE_ORGANIZATIONS,
        );
    });
    channelPartners$ = this.store.select<ChannelPartner[]>(selectChannelPartners);
    currentPartner$$ = this.store.selectSignal<ChannelPartner>(selectCurrentPartner);
    organizations$ = this.store.select<Organization[]>(selectCurrentPartnerOrgs);
    filteredOrganizations$: Observable<Organization[]>;
    destroyRef = inject(DestroyRef);
    currentTabRoute$$ = input.required<string>({ alias: 'currentTabRoute' });

    initializedTabs = false;
    tabs$$ = computed(() => {
        const currPartner = this.currentPartner$$();
        if (!currPartner) {
            return [];
        }
        const { ownPermissions, ownRoles } = currPartner;
        return this.populateTabs({ ownPermissions, ownRoles });
    });
    currentTabIndex$$ = computed(() => {
        const tabs = this.tabs$$();
        const currentTabRoute = this.currentTabRoute$$();
        for (const [index, tab] of tabs.entries()) {
            if (tab.route === currentTabRoute) {
                return index;
            }
        }
        return -1;
    });
    processedTabs = false;
    searchConfig = searchConfig;

    search = { value: '' };
    searchChanged = new Subject<void>();

    constructor(
        private store: Store,
        private router: Router,
        private route: ActivatedRoute,
        private CPService: NxChannelPartnersService,
        private dialogsService: NxDialogsService,
    ) {}

    ngOnInit(): void {
        this.CPService.paramStateHandler.state$
            .pipe(
                map(({ params }) => params.partnerId),
                distinctUntilChanged(),
                takeUntilDestroyed(this.destroyRef),
                combineLatestWith(this.channelPartners$),
            )
            .subscribe(([currentPartnerId, partners]) => {
                const currPartner = partners.find(partner => partner.id === currentPartnerId);
                if (partners.length && !currPartner) {
                    return throwError(() => 'Partner not found');
                }
                this.store.dispatch(CPActions.loadPartnerOrgs({ partnerId: currentPartnerId }));
            });
        this.searchChanged
            .pipe(debounceTime(this.searchConfig.debounceTime), takeUntilDestroyed(this.destroyRef))
            .subscribe(() => {
                this.searchSystems();
            });

        this.search.value = this.route.snapshot.queryParams.search;
        this.searchSystems();
    }

    get showOrganizations(): boolean {
        return !this.tabs$$()[this.currentTabIndex$$()]?.route;
    }

    newOrgDialog(): void {
        this.dialogsService
            .createOrganization(this.currentPartner$$().id)
            .then((org: Organization) => {
                if (org) {
                    this.store.dispatch(
                        CPActions.addPartnerOrg({
                            newPartnerOrg: org,
                        }),
                    );
                }
            });
    }

    onTabClick(newIndex: number): void {
        const newTab = this.tabs$$()[newIndex];
        const route = ['home', 'channelPartners', this.currentPartner$$().id];
        if (newTab.route) {
            route.push(newTab.route);
        }
        this.router.navigate(route);
    }

    handleOrgClick(id: string): void {
        this.router.navigate(['organization', id], { relativeTo: this.route });
    }

    searchSystems(): void {
        const search = this.search.value;

        if (search) {
            this.filteredOrganizations$ = this.organizations$.pipe(
                map(res => res.filter(org => caseInsenstiveSearch(org.name, search))),
            );
        } else {
            this.filteredOrganizations$ = this.organizations$;
        }
    }

    setSearch(model: { query: string }): void {
        this.search.value = model.query;
        this.searchChanged.next();
    }

    populateTabs(partnerAccess: { ownPermissions: string[]; ownRoles: string[] }): Tab[] {
        const tabs: Tab[] = [];
        const { ownRoles, ownPermissions } = partnerAccess;
        if (ownPermissions.includes(ChannelPartnerPermissions.ALTER_STATE_ORGANIZATIONS)) {
            tabs.splice(0, 0, {
                displayName: this.LANG.channelPartners.tabNames.organizations,
                route: '',
            });
        }
        if (ownRoles.includes(ChannelPartnerRoles.ADMINISTRATOR)) {
            tabs.splice(1, 0, {
                displayName: this.LANG.channelPartners.tabNames.partners,
                route: 'subchannels',
            });
        }
        if (ownPermissions.includes(ChannelPartnerPermissions.MANAGE_USERS)) {
            tabs.push({
                displayName: this.LANG.channelPartners.tabNames.users,
                route: 'users',
            });
        }
        if (ownPermissions.includes(ChannelPartnerPermissions.CONFIGURE_CHANNEL_PARTNER)) {
            tabs.push({
                displayName: this.LANG.channelPartners.tabNames.information,
                route: 'information',
            });
            tabs.push({
                displayName: this.LANG.channelPartners.tabNames.settings,
                route: 'settings',
            });
        }
        return tabs;
    }
}
