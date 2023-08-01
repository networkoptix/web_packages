import { CdkMenuModule } from '@angular/cdk/menu';
import { AsyncPipe, NgFor, NgIf } from '@angular/common';
import { Component } from '@angular/core';
import { ActivatedRoute, Router, RouterOutlet } from '@angular/router';
import { UntilDestroy } from '@ngneat/until-destroy';
import { Store } from '@ngrx/store';
import { AngularSvgIconModule } from 'angular-svg-icon';
import { map } from 'rxjs';

import { NxDialogsService } from '@dialogs/dialogs.service';
import { DirectivesModule } from '@directives/directives.module';
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
    standalone: true,
    imports: [
        RouterOutlet,
        CdkMenuModule,
        DirectivesModule,
        AngularSvgIconModule,
        NgFor,
        NgIf,
        AsyncPipe,
    ],
})
export class NxSubchannelsComponent {
    icons = icons;
    isAdmin = true;
    currentPartnerId = this.store.selectSignal<string>(selectCurrentPartnerId);
    subchannels$ = this.store.select(selectCurrentSubchannelPartners);
    inSubchannels$ = this.route.parent.data.pipe(map(data => data.parentData.inSubchannel));

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
    }

    newPartnerDialog(): void {
        this.dialogsService.createChannelPartner(this.currentPartnerId());
    }

    handleChannelClick(id: string): void {
        this.router.navigate([id], { relativeTo: this.route });
    }
}
