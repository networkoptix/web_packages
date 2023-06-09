import { Component } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { Store } from '@ngrx/store';
import { filter, map, take } from 'rxjs';

import { NxDialogsService } from '@dialogs/dialogs.service';
import { icons } from '@lib/variables/static-variables';
import { NxChannelPartnersService } from '@pages/home/services/channel-partners.service';
import {
    selectCurrentPartnerId,
    selectCurrentSubchannelPartners,
} from '@pages/home/store/channel-partners/channel-partners.selectors';

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
})
export class NxSubchannelsComponent {
    icons = icons;
    isAdmin = true;
    currentPartnerId$ = this.store.select(selectCurrentPartnerId).pipe(filter(res => !!res));
    subchannels$ = this.store.select(selectCurrentSubchannelPartners);
    inSubchannels$ = this.route.parent.data.pipe(map(data => data.parentData.inSubchannel));

    constructor(
        private store: Store,
        private dialogsService: NxDialogsService,
        private CPService: NxChannelPartnersService,
        private router: Router,
        private route: ActivatedRoute,
    ) {
        this.currentPartnerId$.pipe(untilDestroyed(this)).subscribe(id => {
            this.CPService.getSubChannelPartners(id).subscribe(partners => {
                this.store.dispatch(
                    CPActions.setCurrentSubchannelPartners({ currentSubchannels: partners }),
                );
            });
        });
    }

    newPartnerDialog(): void {
        this.currentPartnerId$
            .pipe(take(1))
            .subscribe(id => this.dialogsService.createChannelPartner(id));
    }

    handleChannelClick(id: string): void {
        this.router.navigate([id], { relativeTo: this.route });
    }
}
