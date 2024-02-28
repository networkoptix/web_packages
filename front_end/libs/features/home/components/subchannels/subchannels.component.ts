import { CdkMenuModule } from '@angular/cdk/menu';
import { CommonModule } from '@angular/common';
import { Component, DestroyRef, signal, inject, computed } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterOutlet } from '@angular/router';
import { UntilDestroy } from '@ngneat/until-destroy';
import { Store } from '@ngrx/store';
import { TranslateModule } from '@ngx-translate/core';
import { AngularSvgIconModule } from 'angular-svg-icon';
import { Subject, debounceTime, distinctUntilChanged, filter, map, switchMap } from 'rxjs';

import * as CPActions from '@common/store/channel-partners/channel-partners.actions';
import {
    selectCurrentPartner,
    selectCurrentPartnerId,
    selectCurrentSubchannelPartners,
} from '@common/store/channel-partners/channel-partners.selectors';
import { NxButtonComponent } from '@components/button/button.component';
import { ButtonType } from '@components/button/button.component.types';
import { NxSearchComponent } from '@components/search/search.component';
import { NxDialogsService } from '@dialogs/dialogs.service';
import { NxAddSvgSrcDirective } from '@directives/add-data.directive';
import { NxChannelPartnersService } from '@services/channel-partners.service';
import {
    ChannelPartner,
    ChannelPartnerPermissions,
} from '@services/nx-cloud-api/cloud-services/channel-partners/channel-partners-api.types';
import { nxConfig } from '@services/nx-config/config';
import { icons } from '@static-variables';
import { caseInsenstiveSearch } from '@utils/general';
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
        NxButtonComponent,
        TranslateModule,
        NxAddSvgSrcDirective,
        NxCardComponent,
    ],
})
export class NxSubchannelsComponent {
    buttonType = ButtonType.brand;
    icons = icons;
    canCreatePartners$$ = computed(() => {
        const currentPartner = this.store.selectSignal(selectCurrentPartner)();
        return (
            nxConfig.featureFlags.channelPartnersCreatePartnerUI &&
            currentPartner?.ownPermissions.includes(
                ChannelPartnerPermissions.ADD_REMOVE_SUB_CHANNEL_PARTNERS,
            )
        );
    });
    currentPartnerId$ = this.store.select<string>(selectCurrentPartnerId);
    currentPartnerId$$ = this.store.selectSignal<string>(selectCurrentPartnerId);
    subchannels$$ = this.store.selectSignal(selectCurrentSubchannelPartners);
    filteredSubchannels$$ = signal<ChannelPartner[]>([]);
    inSubchannels$ = this.route.parent.data.pipe(map(data => data.parentData.inSubchannel));
    destroyRef = inject(DestroyRef);
    search = { value: '' };
    searchChanged = new Subject<void>();
    subchannelsStoresLoaded = false;
    searchConfig = searchConfig;

    constructor(
        private store: Store,
        private dialogsService: NxDialogsService,
        private CPService: NxChannelPartnersService,
        private router: Router,
        private route: ActivatedRoute,
    ) {
        this.currentPartnerId$
            .pipe(
                distinctUntilChanged(),
                filter(id => id !== undefined),
                switchMap(id => {
                    return this.CPService.getSubChannelPartners(id);
                }),
            )
            .subscribe(partners => {
                this.store.dispatch(
                    CPActions.setCurrentSubchannelPartners({
                        currentSubchannels: partners.sort((a, b) => a.name.localeCompare(b.name)),
                    }),
                );
                this.subchannelsStoresLoaded = true;
                this.displayPartners();
            });

        this.searchChanged
            .pipe(debounceTime(searchConfig.debounceTime), takeUntilDestroyed(this.destroyRef))
            .subscribe(() => {
                this.displayPartners();
            });

        this.search.value = this.route.snapshot.queryParams.search;
        this.displayPartners();
    }

    newPartnerDialog(): void {
        this.dialogsService.createChannelPartner(this.currentPartnerId$$()).then(newSubchannel => {
            if (!newSubchannel) {
                return;
            }
            const updatedSubchannels = [...this.subchannels$$(), newSubchannel];
            this.store.dispatch(
                CPActions.setCurrentSubchannelPartners({ currentSubchannels: updatedSubchannels }),
            );
            this.displayPartners();
        });
    }

    handleChannelClick(id: string): void {
        this.router.navigate([id], { relativeTo: this.route });
    }

    displayPartners(): void {
        const search = this.search.value;
        const currentSubchannels = this.subchannels$$();

        if (search) {
            const subchannelsWithSearch = currentSubchannels.filter(subchannels => {
                return caseInsenstiveSearch(subchannels.name, search);
            });
            this.filteredSubchannels$$.set(subchannelsWithSearch);
        } else {
            this.filteredSubchannels$$.set(currentSubchannels);
        }
    }

    setSearch(model: { query: string }): void {
        this.search.value = model.query;
        this.searchChanged.next();
    }
}
