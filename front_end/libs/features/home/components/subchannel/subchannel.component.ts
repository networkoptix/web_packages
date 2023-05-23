import { Component } from '@angular/core';
import { Store } from '@ngrx/store';
import { filter, switchMap, take } from 'rxjs';

import { NxDialogsService } from '@dialogs/dialogs.service';
import { NxChannelPartnersService } from '@pages/home/services/channel-partners.service';
import { selectCurrentPartnerId } from '@pages/home/store/channel-partners/channel-partners.selectors';

@Component({
    selector: 'nx-channel-partner-subchannel',
    templateUrl: 'subchannel.component.html',
    styleUrls: ['subchannel.component.scss'],
})
export class NxChannelPartnerSubchannelComponent {
    isAdmin = true;
    currentPartnerId$ = this.store.select(selectCurrentPartnerId).pipe(filter(res => !!res));
    subchannels$ = this.currentPartnerId$.pipe(
        switchMap(id => this.CPService.getSubChannelPartners(id)),
    );

    constructor(
        private store: Store,
        private dialogsService: NxDialogsService,
        private CPService: NxChannelPartnersService,
    ) {}

    newPartnerDialog(): void {
        this.currentPartnerId$
            .pipe(take(1))
            .subscribe(id => this.dialogsService.createChannelPartner(id));
    }
}
