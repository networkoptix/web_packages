import { AsyncPipe, NgClass, NgIf } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { AngularSvgIconModule } from 'angular-svg-icon';
import { distinctUntilChanged, map, Observable, switchMap } from 'rxjs';

import staticLang from '@common/language/language_i18n_static.json';
import { NxDialogsService } from '@dialogs/dialogs.service';
import { ResizeModule } from '@directives/resize/resize.module';
import { HEADER_ITEM } from '@pages/home/home.types';
import { NxChannelPartnersService } from '@pages/home/services/channel-partners.service';
import { ChannelPartnerUserExt } from '@services/nx-cloud-api/cloud-services/channel-partners/channel-partners-api.types';

import { NxUsersTableComponent } from '../../users-table/users-table.component';

@Component({
    selector: 'nx-channel-partner-users',
    templateUrl: 'channel-partner-users.component.html',
    styleUrls: [
        'channel-partner-users.component.scss',
        '../../../components/groups-cards/groups-cards.component.scss',
    ],
    standalone: true,
    imports: [
        AsyncPipe,
        ResizeModule,
        NxUsersTableComponent,
        TranslateModule,
        AngularSvgIconModule,
        NgClass,
        NgIf,
    ],
})
export class NxChannelPartnerUsersComponent implements OnInit {
    LANG = staticLang;

    currentPartnerId$: Observable<string>;
    headers: HEADER_ITEM[];
    records$: Observable<ChannelPartnerUserExt[]>;
    selectedUserId: string;

    constructor(
        private dialogsService: NxDialogsService,
        private CPService: NxChannelPartnersService,
        private route: ActivatedRoute,
    ) {
        this.currentPartnerId$ = this.route.parent.params.pipe(
            map(({ id }) => id),
            distinctUntilChanged(),
        );

        this.records$ = this.currentPartnerId$.pipe(
            switchMap(id => {
                return this.CPService.getChannelPartnerUsers(id);
            }),
            map(users =>
                users.map((user: ChannelPartnerUserExt): ChannelPartnerUserExt => {
                    user.userId = user.email;
                    user.fullName = 'N/A';
                    user.accessLevel = ['N/A'];
                    return user;
                }),
            ),
        );
    }

    ngOnInit(): void {
        this.headers = [
            {
                name: 'email',
                value: this.LANG.channelPartners.usersTableHeaders.login,
                sort: 'string',
            },
            {
                name: 'fullName',
                value: this.LANG.channelPartners.usersTableHeaders.fullName,
                sort: 'string',
            },
            { name: 'accessLevel', value: this.LANG.channelPartners.usersTableHeaders.accessLevel },
            { name: 'groups', value: this.LANG.channelPartners.usersTableHeaders.groups },
        ];
    }

    newUserDialog(partnerId: string): void {
        this.dialogsService.addPartnerUser(partnerId);
    }

    selectUser(rec: ChannelPartnerUserExt): void {
        this.selectedUserId = rec.userId;
    }
}
