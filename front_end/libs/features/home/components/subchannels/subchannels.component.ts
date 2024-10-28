import { CdkMenuModule } from '@angular/cdk/menu';
import { CommonModule } from '@angular/common';
import { Component, computed, DestroyRef, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { Router, RouterOutlet } from '@angular/router';
import { UntilDestroy } from '@ngneat/until-destroy';
import { Store } from '@ngrx/store';
import { TranslateModule } from '@ngx-translate/core';
import { AngularSvgIconModule } from 'angular-svg-icon';
import { debounceTime, distinctUntilChanged, filter, map, mergeWith, NEVER, switchMap } from 'rxjs';

import * as CPActions from '@common/store/channel-partners/channel-partners.actions';
import {
    selectChannelPartners,
    selectCurrentPartnerId,
    selectCurrentSubChannelPartners,
} from '@common/store/channel-partners/channel-partners.selectors';
import { NxPagePlaceholderV2Component } from '@components/placeholders/pageV2/page-placeholder.component';
import { PAGE_PLACEHOLDER } from '@components/placeholders/pageV2/page-placeholder.types';
import { NxPreLoaderComponent } from '@components/placeholders/pre-loader/pre-loader.component';
import { NxSearchComponent } from '@components/search/search.component';
import { NxTagComponent } from '@components/tag/tag.component';
import { NxDialogsService } from '@dialogs/dialogs.service';
import { NxAddSvgSrcDirective } from '@directives/add-data.directive';
import { NxIntersectionObserver } from '@directives/nx-intersection.directive';
import { NxThemeAttributeDirective } from '@directives/theme-attribute.directive';
import staticLang from '@language_static';
import { PermissionsStore } from '@pages/home/store/permissions/permissions.store';
import { ChannelPartnersRouteState } from '@pages/home/store/route-state/route-state.store';
import { PartnerRedirect } from '@pages/home/utils/redirect';
import { NxChannelPartnersService } from '@services/channel-partners.service';
import {
    ChannelPartner,
    PartnerRoles,
} from '@services/nx-cloud-api/cloud-services/channel-partners/channel-partners-api.types';
import { NxParamStateService } from '@services/param-state/param-state.service';
import { icons } from '@static-variables';
import { alphaNumericSortByName, caseInsensitiveSearch } from '@utils/general';
import { pipeSignal } from '@utils/signals';
import { search as searchConfig } from '@variables/static-variables';

import { NxCardComponent } from '../card/card.component';

@UntilDestroy()
@Component({
    selector: 'nx-subchannels',
    templateUrl: 'subchannels.component.html',
    styleUrls: [
        'subchannels.component.scss',
        '../../organizations/cards-container/org-cards-container.component.scss',
    ],
    standalone: true,
    imports: [
        RouterOutlet,
        CdkMenuModule,
        AngularSvgIconModule,
        NxSearchComponent,
        FormsModule,
        CommonModule,
        TranslateModule,
        NxAddSvgSrcDirective,
        NxCardComponent,
        NxTagComponent,
        NxPagePlaceholderV2Component,
        NxIntersectionObserver,
        NxPreLoaderComponent,
    ],
    hostDirectives: [NxThemeAttributeDirective],
})
export class NxSubchannelsComponent {
    permissionsStore = inject(PermissionsStore);
    LANG = staticLang;
    icons = icons;
    PAGE_PLACEHOLDER = PAGE_PLACEHOLDER;
    canCreatePartners$$ = this.permissionsStore.canCreateSubChannels$$;
    currentPartnerId$ = this.store.select<string>(selectCurrentPartnerId);
    currentPartnerId$$ = toSignal(this.currentPartnerId$);
    channelPartners$$ = this.store.selectSignal<ChannelPartner[]>(selectChannelPartners);
    subchannels$$ = this.store.selectSignal(selectCurrentSubChannelPartners);
    search$$ = inject(NxParamStateService).getStateHandler(
        ({ queryParams }) => queryParams.search?.[0] || '',
    ).state$$;
    searchState$$ = pipeSignal(
        this.search$$,
        query$ =>
            query$.pipe(
                debounceTime(300),
                switchMap(query => {
                    const partnerId = this.currentPartnerId$$();
                    if (!partnerId || !query) {
                        return NEVER;
                    }
                    return this.CPService.cpApi
                        .getSubChannelPartners(partnerId)
                        .withQueryParams({ name: query, page_size: '1000' });
                }),
                map(partners => ({
                    loading: false,
                    results: partners,
                })),
                mergeWith(
                    query$.pipe(map(() => ({ loading: true, results: [] as ChannelPartner[] }))),
                ),
            ),
        {
            loading: true,
            results: [] as ChannelPartner[],
        },
    );
    subChannelsFromApi$$ = computed(() => this.searchState$$().results);
    subChannelsSearchLoading$$ = computed(() => this.searchState$$().loading);
    filteredSubchannels$$ = computed(() => {
        const partiallyLoaded = !!this.remaining$$();
        if (partiallyLoaded && this.search$$()) {
            return this.subChannelsFromApi$$();
        }
        const search = this.search$$();
        const currentSubchannels = this.subchannels$$();

        if (!search) {
            return currentSubchannels;
        }
        return currentSubchannels.filter(subchannels => {
            return caseInsensitiveSearch(subchannels.name, search);
        });
    });

    routerState = inject(ChannelPartnersRouteState);
    destroyRef = inject(DestroyRef);
    subchannelsStoresLoaded = false;
    searchConfig = searchConfig;
    remaining$$ = signal(-1);
    showInfiniteLoader$$ = signal(false);
    loadMore = (): void => {};

    constructor(
        private store: Store,
        private dialogsService: NxDialogsService,
        private CPService: NxChannelPartnersService,
        private router: Router,
    ) {
        this.currentPartnerId$
            .pipe(
                distinctUntilChanged(),
                filter(id => id !== undefined),
                switchMap(id => {
                    const paginated$ = this.CPService.cpApi
                        .getSubChannelPartners(id)
                        .withPageUpdater();
                    this.loadMore = paginated$.loadMore;
                    paginated$.registerHasMoreNotifier((hasMore, remaining) => {
                        this.showInfiniteLoader$$.set(hasMore);
                        this.remaining$$.set(remaining);
                    });
                    return paginated$;
                }),
            )
            .subscribe(partners => {
                this.store.dispatch(
                    CPActions.setCurrentSubChannelPartners({
                        currentSubchannels: partners.sort(alphaNumericSortByName),
                    }),
                );
                this.subchannelsStoresLoaded = true;
            });
    }

    newPartnerDialog(): void {
        this.dialogsService.createChannelPartner(this.currentPartnerId$$()).then(newSubchannel => {
            if (!newSubchannel) {
                return;
            }
            const updatedSubchannels = [...this.subchannels$$(), newSubchannel];
            this.store.dispatch(
                CPActions.setCurrentSubChannelPartners({ currentSubchannels: updatedSubchannels }),
            );
        });
    }

    handleChannelClick(id: string): Promise<boolean> {
        const subChannel = this.subchannels$$().find(partner => partner.id === id);
        const channelPartner = this.channelPartners$$().find(partner => partner.id === id);
        const isPartner =
            subChannel &&
            !subChannel.ownPermissions?.includes(PartnerRoles.field_access_cp_accountant) &&
            !!channelPartner;

        let redirectUrl = PartnerRedirect.toPartner(id);
        if (!isPartner) {
            redirectUrl = PartnerRedirect.toSubChannelPartner(id) + '/settings';
            if (
                !this.permissionsStore.canChangePartnerState$$() &&
                this.permissionsStore.canViewPartnerReports$$()
            ) {
                redirectUrl = PartnerRedirect.toSubChannelPartner(id) + '/reports';
            }
        }

        if (isPartner) {
            this.store.dispatch(CPActions.setCurrentPartnerId({ currentPartnerId: id }));
        }
        return this.router.navigate([redirectUrl]);
    }
}
