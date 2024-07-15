import { CdkMenuModule } from '@angular/cdk/menu';
import { CommonModule } from '@angular/common';
import {
    Component,
    OnInit,
    DestroyRef,
    inject,
    computed,
    input,
    HostBinding,
    effect,
    untracked,
    signal,
} from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { Store } from '@ngrx/store';
import { TranslateModule } from '@ngx-translate/core';
import { AngularSvgIconModule } from 'angular-svg-icon';
import { NEVER, combineLatest, combineLatestWith, throwError } from 'rxjs';
import {
    debounceTime,
    distinctUntilChanged,
    map,
    mergeWith,
    shareReplay,
    switchMap,
} from 'rxjs/operators';

import * as CPActions from '@common/store/channel-partners/channel-partners.actions';
import {
    selectChannelPartners,
    selectCurrentPartner,
    selectCurrentPartnerOrgs,
    selectCurrentPartnerParent,
    selectArePartnerOrgsLoading,
    selectBanner,
    selectCurrentParentPartnerForChild,
} from '@common/store/channel-partners/channel-partners.selectors';
import { NxAlertBlockComponent } from '@components/content-block/alert/block.component';
import { NxPagePlaceholderV2Component } from '@components/placeholders/pageV2/page-placeholder.component';
import { PAGE_PLACEHOLDER } from '@components/placeholders/pageV2/page-placeholder.types';
import { NxPreLoaderComponent } from '@components/placeholders/pre-loader/pre-loader.component';
import { NxPagePlaceholderNoAccessComponent } from '@components/placeholdersV2/page/no-access/page-placeholder.component';
import { NxPagePlaceholderGenericNewV2Component } from '@components/placeholdersV2/page/page-placeholder.component';
import { NxSearchComponent } from '@components/search/search.component';
import { NxTabsModule } from '@components/tabs/tabs.module';
import { Tab } from '@components/tabs/tabs.types';
import { NxTagComponent } from '@components/tag/tag.component';
import { NxDialogsService } from '@dialogs/dialogs.service';
import { NxAddSvgSrcDirective } from '@directives/add-data.directive';
import { NxIntersectionObserver } from '@directives/nx-intersection.directive';
import { NxResizeObserver } from '@directives/resize/nx-resize.directive';
import staticLang from '@language_static';
import { PermissionsStore } from '@pages/home/store/permissions/permissions.store';
import { PartnerRedirect } from '@pages/home/utils/redirect';
import { PipesModule } from '@pipes/pipes.module';
import { NxChannelPartnersService } from '@services/channel-partners.service';
import {
    ChannelPartner,
    Organization,
    ChannelPartnerRoleIds,
} from '@services/nx-cloud-api/cloud-services/channel-partners/channel-partners-api.types';
import { alphaNumericSortByName, caseInsensitiveSearch } from '@utils/general';
import { paramSignal } from '@utils/signals';
import { search as searchConfig, icons } from '@variables/static-variables';

import { NxCardComponent } from '../components/card/card.component';
import { ChannelPartnersRouteState } from '../store/route-state/route-state.store';

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
        PipesModule,
        NxResizeObserver,
        NxPagePlaceholderV2Component,
        NxPagePlaceholderNoAccessComponent,
        NxPagePlaceholderGenericNewV2Component,
        NxAlertBlockComponent,
        NxIntersectionObserver,
    ],
})
export class NxChannelPartnersComponent implements OnInit {
    icons = icons;
    LANG = staticLang;
    PAGE_PLACEHOLDER = PAGE_PLACEHOLDER;
    ChannelPartnerRoleIds = ChannelPartnerRoleIds;

    permissionStore = inject(PermissionsStore);
    routerState = inject(ChannelPartnersRouteState);

    isLoading$$ = this.store.selectSignal<boolean>(selectArePartnerOrgsLoading);
    routeData$ = this.route.data;
    channelPartners$ = this.store.select<ChannelPartner[]>(selectChannelPartners);
    currentPartner$ = this.store.select(selectCurrentPartner);
    currentPartner$$ = this.store.selectSignal<ChannelPartner>(selectCurrentPartner);
    parentPartner$$ = this.store.selectSignal<ChannelPartner>(selectCurrentPartnerParent);
    showInfiniteLoader$$ = signal(false);
    remaining$$ = signal(-1);
    loadMore = (): void => {};
    organizations$ = this.currentPartner$.pipe(
        switchMap(partner => {
            if (partner) {
                const orgs$ = this.CPService.getPartnerOrganizations(partner.id).withPageUpdater();
                this.loadMore = orgs$.loadMore;
                orgs$.registerHasMoreNotifier((hasMore, remaining) => {
                    this.showInfiniteLoader$$.set(hasMore);
                    this.remaining$$.set(remaining);
                });
                return orgs$;
            }

            return NEVER;
        }),
        switchMap(orgs => {
            this.store.dispatch(
                CPActions.setCurrentPartner({
                    currentPartnerId: this.currentPartner$$().id,
                    currentPartnerOrganizations: orgs.sort(alphaNumericSortByName),
                }),
            );
            return this.store.select(selectCurrentPartnerOrgs);
        }),
        shareReplay({ bufferSize: 1, refCount: false }),
    );

    search$$ = paramSignal('search');
    search$ = toObservable(this.search$$);

    organizationsFromApiState$ = combineLatest([this.search$, this.currentPartner$]).pipe(
        debounceTime(300),
        switchMap(([query, currentPartner]) => {
            if (query && currentPartner) {
                return this.CPService.getPartnerOrganizations(currentPartner.id)
                    .withQueryParams({
                        name: query,
                        page_size: '1000',
                    })
                    .pipe(
                        map(results => ({
                            loading: false,
                            results,
                        })),
                    );
            }

            return NEVER;
        }),
        mergeWith(
            this.search$.pipe(
                map(() => ({
                    loading: true,
                    results: [] as Organization[],
                })),
            ),
        ),
        shareReplay({ bufferSize: 1, refCount: false }),
    );

    filteredOrganizations$ = combineLatest([toObservable(this.remaining$$), this.search$]).pipe(
        switchMap(([remaining, query]) => {
            if (remaining && query) {
                return this.organizationsFromApiState$.pipe(map(state => state.results));
            }

            return this.organizations$.pipe(
                map(orgs => orgs.filter(({ name }) => caseInsensitiveSearch(name, query))),
            );
        }),
    );

    destroyRef = inject(DestroyRef);
    currentTabRoute$$ = input.required<string>({ alias: 'currentTabRoute' });
    banner$$ = this.store.selectSignal(selectBanner);
    directParentPartner$$ = this.store.selectSignal(selectCurrentParentPartnerForChild);

    hasSupportInfo$$ = computed(() => {
        return Object.values(this.directParentPartner$$()?.supportInformation || []).some(
            fieldset => fieldset?.length,
        );
    });

    tabs$$ = computed(() => {
        const tabs: Tab[] = [];
        if (this.permissionStore.canViewOrgs$$()) {
            tabs.push({
                displayName: this.LANG.channelPartners.tabNames.organizations,
                route: '',
            });
        }
        if (this.permissionStore.canViewSubChannels$$()) {
            tabs.push({
                displayName: this.LANG.channelPartners.tabNames.partners,
                route: 'subchannels',
            });
        }
        if (this.permissionStore.canViewInfo$$()) {
            tabs.push({
                displayName: this.LANG.channelPartners.tabNames.information,
                route: 'information',
            });
        }
        if (this.permissionStore.canViewPartnerUsers$$()) {
            tabs.push({
                displayName: this.LANG.channelPartners.tabNames.users,
                route: 'users',
            });
        }
        if (this.permissionStore.canViewPartnerReports$$()) {
            tabs.push({
                displayName: this.LANG.channelPartners.tabNames.reports,
                route: 'reports',
            });
        }
        if (this.permissionStore.canViewPartnerSupportUI$$() && this.hasSupportInfo$$()) {
            tabs.push({
                displayName: this.LANG.channelPartners.tabNames.support,
                route: 'support',
            });
        }
        if (this.permissionStore.canViewPartnerSettings$$()) {
            tabs.push({
                displayName: this.LANG.channelPartners.tabNames.settings,
                route: 'settings',
            });
        }
        return tabs;
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
    returnToParentLink$$ = computed(() => {
        const parentChannelPartner = this.parentPartner$$();
        return parentChannelPartner
            ? PartnerRedirect.toPartnerSubChannels(parentChannelPartner.id)
            : '';
    });
    processedTabs = false;
    isValidPartner = true;
    searchConfig = searchConfig;

    constructor(
        private store: Store,
        private route: ActivatedRoute,
        private CPService: NxChannelPartnersService,
        private dialogsService: NxDialogsService,
    ) {}

    updateParentInfoEffect = effect(() => {
        this.currentPartner$$();
        untracked(() => this.fetchParentInfoOnLoad());
    });

    private fetchParentInfoOnLoad(): void {
        const currentPartner = this.currentPartner$$();
        if (currentPartner?.parentChannelPartner) {
            this.store.dispatch(
                CPActions.loadCurrentParentPartnerForChild({
                    parentId: currentPartner.parentChannelPartner,
                }),
            );
        } else {
            this.store.dispatch(
                CPActions.setCurrentParentPartnerForChild({
                    parentPartnerForCurrentChild: null,
                }),
            );
        }
    }

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
                    this.isValidPartner = false;
                    return throwError(() => 'Partner not found');
                }
                this.store.dispatch(
                    CPActions.loadPartner({
                        partnerId: currentPartnerId,
                        currentParentPartnerId: currPartner?.parentChannelPartner || '',
                    }),
                );
            });
    }

    get showOrganizations(): boolean {
        return !this.tabs$$()[this.currentTabIndex$$()]?.route;
    }

    newOrgDialog = (): void => {
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
    };

    @HostBinding('style.--channel-partners-header-height') headerHeight = '324px';

    updateHeaderSize(el: HTMLElement): void {
        const padding = 16 as const;
        const headerHeight = el.getBoundingClientRect().top;
        this.headerHeight = `${Math.floor(headerHeight + padding)}px`;
    }
}
