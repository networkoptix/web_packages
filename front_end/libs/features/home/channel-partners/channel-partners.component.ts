import { CdkMenuModule } from '@angular/cdk/menu';
import { CommonModule } from '@angular/common';
import { Component, Input, OnInit, DestroyRef, inject, signal } from '@angular/core';
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
    switchMap,
    throwError,
} from 'rxjs';

import { NxPreLoaderComponent } from '@components/placeholders/pre-loader/pre-loader.component';
import { NxSearchComponent } from '@components/search/search.component';
import { NxTabsModule } from '@components/tabs/tabs.module';
import { Tab } from '@components/tabs/tabs.types';
import { NxDialogsService } from '@dialogs/dialogs.service';
import staticLang from '@language_static';
import {
    ChannelPartner,
    Organization,
} from '@services/nx-cloud-api/cloud-services/channel-partners/channel-partners-api.types';
import { caseInsenstiveSearch } from '@utils/general';
import { search as searchConfig, icons } from '@variables/static-variables';

import { NxCardComponent } from '../components/card/card.component';
import { NxChannelPartnersService } from '../services/channel-partners.service';
import * as CPActions from '../store/channel-partners/channel-partners.actions';
import {
    selectChannelPartners,
    selectCurrentPartner,
    selectCurrentPartnerOrgs,
} from '../store/channel-partners/channel-partners.selectors';

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
    ],
})
export class NxChannelPartnersComponent implements OnInit {
    icons = icons;
    LANG = staticLang;

    isLoading = true;
    currentPartnerId: string;
    currentPartnerOrgs: Organization[];
    routeData$ = this.route.data;
    channelPartners$ = this.store.select<ChannelPartner[]>(selectChannelPartners);
    currentPartner$ = this.store.select<ChannelPartner>(selectCurrentPartner);
    organizations$ = this.store.select<Organization[]>(selectCurrentPartnerOrgs);
    filteredOrganizations$: Observable<Organization[]>;
    destroyRef = inject(DestroyRef);
    @Input() isAdmin: boolean;
    @Input() currentTabRoute: string;
    @Input() partnerId: string;
    currentTabIndex$$ = signal<number>(0);
    tabs: Tab[] = [
        {
            displayName: this.LANG.channelPartners.tabNames.organizations,
            route: '',
        },
        {
            displayName: this.LANG.channelPartners.tabNames.subchannel,
            route: 'subchannels',
        },
        {
            displayName: this.LANG.channelPartners.tabNames.information,
            route: 'information',
        },
    ];
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
        if (this.isAdmin) {
            this.tabs.push(
                ...[
                    {
                        displayName: this.LANG.channelPartners.tabNames.users,
                        route: 'users',
                    },
                    {
                        displayName: this.LANG.channelPartners.tabNames.settings,
                        route: 'settings',
                    },
                ],
            );
        }
        for (const [index, tab] of this.tabs.entries()) {
            if (tab.route === this.currentTabRoute) {
                this.currentTabIndex$$.set(index);
                break;
            }
        }
        this.CPService.paramStateHandler.state$
            .pipe(
                map(({ params }) => params.partnerId),
                distinctUntilChanged(),
                takeUntilDestroyed(this.destroyRef),
                combineLatestWith(this.channelPartners$),
                switchMap(([id, partners]) => {
                    this.currentPartnerId = id;
                    if (partners.length && !partners.find(p => p.id === id)) {
                        return throwError(() => 'Partner not found');
                    }
                    return this.CPService.getPartnerOrganizations(id);
                }),
            )
            .subscribe({
                next: orgs => {
                    this.isLoading = false;
                    this.currentPartnerOrgs = orgs;
                    this.store.dispatch(
                        CPActions.setCurrentPartner({
                            currentPartnerId: this.partnerId,
                            currentPartnerOrganizations: orgs,
                        }),
                    );
                },
                error: () => {
                    this.router.navigate(['404']);
                },
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
        return !this.tabs[this.currentTabIndex$$()].route;
    }

    newOrgDialog(): void {
        this.dialogsService.createOrganization(this.partnerId).then((org: Organization) => {
            this.store.dispatch(
                CPActions.setCurrentPartner({
                    currentPartnerId: this.partnerId,
                    currentPartnerOrganizations: [...this.currentPartnerOrgs, org],
                }),
            );
        });
    }

    onTabClick(newIndex: number): void {
        const currTab = this.tabs[newIndex];
        if (currTab.route !== '') {
            this.router.navigate(['home', 'channelPartners', this.currentPartnerId, currTab.route]);
        } else {
            this.router.navigate(['home', 'channelPartners', this.partnerId]);
        }
    }

    handleOrgClick(id: string): void {
        this.router.navigate(['organization', id, 'systems'], { relativeTo: this.route });
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
}
