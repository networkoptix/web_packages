import { AsyncPipe, CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { AngularSvgIconModule } from 'angular-svg-icon';
import { catchError, distinctUntilChanged, map, Observable, switchMap } from 'rxjs';

import { NxDialogsService } from '@dialogs/dialogs.service';
import { NxResizeObserver } from '@directives/resize/nx-resize.directive';
import staticLang from '@language_static';
import { HEADER_ITEM } from '@pages/home/home.types';
import { NxChannelPartnersService } from '@pages/home/services/channel-partners.service';

import { NxUsersTableComponent } from '../../users-table/users-table.component';

import type { UserRecord } from './channel-partner-users.types';
import { UserType } from './channel-partner-users.types';

@Component({
    selector: 'nx-channel-partner-users',
    templateUrl: 'channel-partner-users.component.html',
    styleUrls: [
        'channel-partner-users.component.scss',
        '../../../organizations/cards-container/org-cards-container.component.scss',
    ],
    standalone: true,
    imports: [
        CommonModule,
        AsyncPipe,
        NxUsersTableComponent,
        TranslateModule,
        AngularSvgIconModule,
        NxResizeObserver,
    ],
})
export class NxChannelPartnerUsersComponent implements OnInit {
    LANG = staticLang;
    UserType = UserType;

    currentPartnerId$: Observable<string>;
    headers: HEADER_ITEM[];
    records$: Observable<UserRecord[]>;
    selectedUserEmail: string;

    constructor(
        private dialogsService: NxDialogsService,
        private CPService: NxChannelPartnersService,
    ) {
        this.currentPartnerId$ = this.CPService.paramStateHandler.state$.pipe(
            map(({ params: { partnerId } }) => partnerId),
            distinctUntilChanged(),
        );

        this.records$ = this.currentPartnerId$.pipe(
            switchMap(id => this.CPService.getChannelPartnerUsers(id)),
            map(users =>
                users.map(user => ({
                    ...user,
                    userId: user.email,
                    fullName: 'N/A',
                    userType: UserType.CHANNEL_PARTNER,
                })),
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
            { name: 'groups', value: this.LANG.channelPartners.usersTableHeaders.groups },
        ];
    }

    newUserDialog(partnerId: string): void {
        this.dialogsService.addPartnerUser(partnerId);
    }

    selectUser(rec: UserRecord): void {
        this.selectedUserEmail = rec.userId;
    }

    deleteChannelPartnerUser(email: string): void {
        this.currentPartnerId$
            .pipe(
                switchMap(id => this.CPService.deleteChannelPartnerUser(id, email)),
                catchError(err => {
                    throw err;
                }),
            )
            .subscribe({
                error: err => console.error(err),
            });
    }
}
