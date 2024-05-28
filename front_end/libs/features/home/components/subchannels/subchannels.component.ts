import { CdkMenuModule } from '@angular/cdk/menu';
import { CommonModule } from '@angular/common';
import { Component, DestroyRef, inject, computed } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterOutlet } from '@angular/router';
import { UntilDestroy } from '@ngneat/until-destroy';
import { Store } from '@ngrx/store';
import { TranslateModule } from '@ngx-translate/core';
import { AngularSvgIconModule } from 'angular-svg-icon';
import { distinctUntilChanged, filter, map, switchMap } from 'rxjs';

import * as CPActions from '@common/store/channel-partners/channel-partners.actions';
import {
    selectChannelPartners,
    selectCurrentPartnerId,
    selectCurrentSubchannelPartners,
} from '@common/store/channel-partners/channel-partners.selectors';
import { NxButtonComponent } from '@components/button/button.component';
import { NxPagePlaceholderV2Component } from '@components/placeholders/pageV2/page-placeholder.component';
import { PAGE_PLACEHOLDER } from '@components/placeholders/pageV2/page-placeholder.types';
import { NxSearchComponent } from '@components/search/search.component';
import { NxTagComponent } from '@components/tag/tag.component';
import { NxDialogsService } from '@dialogs/dialogs.service';
import { NxAddSvgSrcDirective } from '@directives/add-data.directive';
import { PermissionsStore } from '@pages/home/store/permissions/permissions.store';
import { PartnerRedirect } from '@pages/home/utils/redirect';
import { NxChannelPartnersService } from '@services/channel-partners.service';
import { ChannelPartner } from '@services/nx-cloud-api/cloud-services/channel-partners/channel-partners-api.types';
import { NxParamStateService } from '@services/param-state/param-state.service';
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
        NxTagComponent,
        NxPagePlaceholderV2Component,
    ],
})
export class NxSubchannelsComponent {
    permissionsStore = inject(PermissionsStore);
    icons = icons;
    PAGE_PLACEHOLDER = PAGE_PLACEHOLDER;
    canCreatePartners$$ = this.permissionsStore.canCreateSubChannels$$;
    currentPartnerId$ = this.store.select<string>(selectCurrentPartnerId);
    currentPartnerId$$ = toSignal(this.currentPartnerId$);
    channelPartners$$ = this.store.selectSignal<ChannelPartner[]>(selectChannelPartners);
    subchannels$$ = this.store.selectSignal(selectCurrentSubchannelPartners);
    filteredSubchannels$$ = computed(() => {
        const search = this.search$$();
        const currentSubchannels = this.subchannels$$();

        if (!search) {
            return currentSubchannels;
        }
        return currentSubchannels.filter(subchannels => {
            return caseInsenstiveSearch(subchannels.name, search);
        });
    });
    inSubchannels$ = this.route.parent.data.pipe(map(data => data.parentData.inSubchannel));
    destroyRef = inject(DestroyRef);
    search$$ = inject(NxParamStateService).getStateHandler(
        ({ queryParams }) => queryParams.search?.[0] || '',
    ).state$$;
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
            });
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
        });
    }

    handleChannelClick(id: string): Promise<boolean> {
        const redirectUrl = this.channelPartners$$().find(partner => partner.id === id)
            ? PartnerRedirect.toPartner(id)
            : PartnerRedirect.toSubChannelPartner(id);
        return this.router.navigate([redirectUrl]);
    }
}
