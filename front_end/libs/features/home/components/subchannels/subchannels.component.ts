import { CdkMenuModule } from '@angular/cdk/menu';
import { AsyncPipe, CommonModule, NgFor, NgIf } from '@angular/common';
import { Component, DestroyRef, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterOutlet } from '@angular/router';
import { UntilDestroy } from '@ngneat/until-destroy';
import { Store } from '@ngrx/store';
import { TranslateModule } from '@ngx-translate/core';
import { AngularSvgIconModule } from 'angular-svg-icon';
import { Observable, Subject, debounceTime, map } from 'rxjs';

import { NxButtonComponent } from '@components/button/button.component';
import { ButtonType } from '@components/button/button.component.types';
import { NxSearchComponent } from '@components/search/search.component';
import { NxTabsDirective } from '@components/tabs/tabs.directive';
import { NxDialogsService } from '@dialogs/dialogs.service';
import { DirectivesModule } from '@directives/directives.module';
import { icons } from '@lib/variables/static-variables';
import { NxChannelPartnersService } from '@pages/home/services/channel-partners.service';
import {
    selectCurrentPartnerId,
    selectCurrentSubchannelPartners,
} from '@pages/home/store/channel-partners/channel-partners.selectors';
import { ChannelPartner } from '@services/nx-cloud-api/cloud-services/channel-partners/channel-partners-api.types';
import { caseInsenstiveSearch } from '@utils/general';
import { search } from '@variables/static-variables';

import * as CPActions from '../../store/channel-partners/channel-partners.actions';

@UntilDestroy()
@Component({
    selector: 'nx-subchannels',
    templateUrl: 'subchannels.component.html',
    styleUrls: [
        'subchannels.component.scss',
        '../../components/groups-cards/groups-cards.component.scss',
        '../../components/system-card/system-card.component.scss',
    ],
    standalone: true,
    imports: [
        RouterOutlet,
        CdkMenuModule,
        DirectivesModule,
        AngularSvgIconModule,
        NgFor,
        NgIf,
        AsyncPipe,
        NxSearchComponent,
        FormsModule,
        CommonModule,
        NxButtonComponent,
        TranslateModule,
        NxTabsDirective,
    ],
})
export class NxSubchannelsComponent {
    buttonType = ButtonType.brand;
    icons = icons;
    isAdmin = true;
    currentPartnerId = this.store.selectSignal<string>(selectCurrentPartnerId);
    subchannels$ = this.store.select(selectCurrentSubchannelPartners);
    filteredSubchannels$: Observable<ChannelPartner[]>;
    inSubchannels$ = this.route.parent.data.pipe(map(data => data.parentData.inSubchannel));
    destroyRef = inject(DestroyRef);
    search = { value: '' };
    searchChanged = new Subject<void>();

    constructor(
        private store: Store,
        private dialogsService: NxDialogsService,
        private CPService: NxChannelPartnersService,
        private router: Router,
        private route: ActivatedRoute,
    ) {
        this.CPService.getSubChannelPartners(this.currentPartnerId()).subscribe(partners => {
            this.store.dispatch(
                CPActions.setCurrentSubchannelPartners({ currentSubchannels: partners }),
            );
        });

        this.searchChanged
            .pipe(debounceTime(search.debounceTime), takeUntilDestroyed(this.destroyRef))
            .subscribe(() => {
                this.searchSystems();
            });

        this.search.value = this.route.snapshot.queryParams.search;
        this.searchSystems();
    }

    newPartnerDialog(): void {
        this.dialogsService.createChannelPartner(this.currentPartnerId());
    }

    handleChannelClick(id: string): void {
        this.router.navigate([id], { relativeTo: this.route });
    }

    searchSystems(): void {
        const search = this.search.value;

        if (search) {
            this.filteredSubchannels$ = this.subchannels$.pipe(
                map(res => res.filter(org => caseInsenstiveSearch(org.name, search))),
            );
        } else {
            this.filteredSubchannels$ = this.subchannels$;
        }
    }

    setSearch(model: { query: string }): void {
        this.search.value = model.query;
        this.searchChanged.next();
    }
}
