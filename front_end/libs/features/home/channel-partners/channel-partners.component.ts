import { CdkMenuModule } from '@angular/cdk/menu';
import { CommonModule } from '@angular/common';
import { Component, OnInit, DestroyRef, inject, computed, input, HostBinding } from '@angular/core';
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
    selectRootChannelPartners,
    selectCurrentPartner,
    selectCurrentPartnerOrgs,
    selectArePartnerOrgsLoading,
} from '@common/store/channel-partners/channel-partners.selectors';
import { NxPagePlaceholderV2Component } from '@components/placeholders/pageV2/page-placeholder.component';
import { PAGE_PLACEHOLDER } from '@components/placeholders/pageV2/page-placeholder.types';
import { NxPreLoaderComponent } from '@components/placeholders/pre-loader/pre-loader.component';
import { NxSearchComponent } from '@components/search/search.component';
import { NxTabsModule } from '@components/tabs/tabs.module';
import { Tab } from '@components/tabs/tabs.types';
import { NxTagComponent } from '@components/tag/tag.component';
import { NxDialogsService } from '@dialogs/dialogs.service';
import { NxAddSvgSrcDirective } from '@directives/add-data.directive';
import { NxResizeObserver } from '@directives/resize/nx-resize.directive';
import staticLang from '@language_static';
import { PermissionsStore } from '@pages/home/store/permissions/permissions.store';
import { PipesModule } from '@pipes/pipes.module';
import { NxChannelPartnersService } from '@services/channel-partners.service';
import {
    ChannelPartner,
    Organization,
} from '@services/nx-cloud-api/cloud-services/channel-partners/channel-partners-api.types';
import { caseInsenstiveSearch } from '@utils/general';
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
    ],
})
export class NxChannelPartnersComponent implements OnInit {
    icons = icons;
    LANG = staticLang;
    PAGE_PLACEHOLDER = PAGE_PLACEHOLDER;

    permissionStore = inject(PermissionsStore);
    routerState = inject(ChannelPartnersRouteState);

    isLoading$$ = this.store.selectSignal<boolean>(selectArePartnerOrgsLoading);
    routeData$ = this.route.data;
    channelPartners$ = this.store.select<ChannelPartner[]>(selectRootChannelPartners);
    currentPartner$$ = this.store.selectSignal<ChannelPartner>(selectCurrentPartner);
    organizations$ = this.store.select<Organization[]>(selectCurrentPartnerOrgs);
    filteredOrganizations$: Observable<Organization[]>;
    destroyRef = inject(DestroyRef);
    currentTabRoute$$ = input.required<string>({ alias: 'currentTabRoute' });

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
        if (this.permissionStore.canViewPartnerSettings$$()) {
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

    @HostBinding('style.--channel-partners-header-height') headerHeight = '324px';

    updateHeaderSize(el: HTMLElement): void {
        const padding = 16 as const;
        const headerHeight = el.getBoundingClientRect().top;
        this.headerHeight = `${Math.floor(headerHeight + padding)}px`;
    }
}
