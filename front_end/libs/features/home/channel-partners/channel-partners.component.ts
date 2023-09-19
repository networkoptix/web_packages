import { CdkMenuModule } from '@angular/cdk/menu';
import { CommonModule } from '@angular/common';
import { Component, Input, OnInit, DestroyRef, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { Store } from '@ngrx/store';
import { TranslateModule } from '@ngx-translate/core';
import { Observable, Subject, catchError, combineLatestWith, debounceTime, map, of } from 'rxjs';

import { NxPreLoaderComponent } from '@components/placeholders/pre-loader/pre-loader.component';
import { NxSearchComponent } from '@components/search/search.component';
import { NxTabsComponent } from '@components/tabs/tabs.component';
import { NxTabsDirective } from '@components/tabs/tabs.directive';
import { Tab, TabEmit } from '@components/tabs/tabs.types';
import { NxDialogsService } from '@dialogs/dialogs.service';
import staticLang from '@language_static';
import {
    ChannelPartner,
    Organization,
} from '@services/nx-cloud-api/cloud-services/channel-partners/channel-partners-api.types';
import { caseInsenstiveSearch } from '@utils/general';
import { search as searchConfig } from '@variables/static-variables';

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
        '../components/groups-cards/groups-cards.component.scss',
        '../components/system-card/system-card.component.scss',
    ],
    standalone: true,
    imports: [
        NxSearchComponent,
        NxTabsComponent,
        NxPreLoaderComponent,
        CommonModule,
        FormsModule,
        TranslateModule,
        RouterModule,
        CdkMenuModule,
        NxTabsDirective,
    ],
})
export class NxChannelPartnersComponent implements OnInit {
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
    currentTab: Tab;
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
    defaultImage = 'https://picsum.photos/100/50';
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
        this.currentTab = this.tabs.find(tab => tab.route === this.currentTabRoute);
        this.route.params
            .pipe(takeUntilDestroyed(this.destroyRef), combineLatestWith(this.channelPartners$))
            .subscribe(([{ id }, partners]) => {
                this.currentPartnerId = id;
                if (partners.length && !partners.find(p => p.id === this.currentPartnerId)) {
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

        this.searchChanged
            .pipe(debounceTime(this.searchConfig.debounceTime), takeUntilDestroyed(this.destroyRef))
            .subscribe(() => {
                this.searchSystems();
            });

        this.search.value = this.route.snapshot.queryParams.search;
        this.searchSystems();
    }

    newOrgDialog(): void {
        this.dialogsService.createOrganization(this.currentPartnerId).then((org: Organization) => {
            this.store.dispatch(
                CPActions.setCurrentPartner({
                    currentPartnerId: this.currentPartnerId,
                    currentPartnerOrganizations: [...this.currentPartnerOrgs, org],
                }),
            );
        });
    }

    onTabClick(tab: TabEmit): void {
        this.currentTab = this.tabs[tab.index];
        if (tab.route) {
            this.router.navigate(['home', 'channelPartners', this.currentPartnerId, tab.route]);
        } else {
            this.router.navigate(['home', 'channelPartners', this.currentPartnerId]);
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
