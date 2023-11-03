import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { catchError, distinctUntilChanged, map, Observable, switchMap } from 'rxjs';

import { NxDialogsService } from '@dialogs/dialogs.service';
import staticLang from '@language_static';
import { HEADER_ITEM } from '@pages/home/home.types';
import { NxChannelPartnersService } from '@pages/home/services/channel-partners.service';

import { NxUsersTableComponent } from '../../users-table/users-table.component';

import type { OrgUserExt } from './org-users.types';

@Component({
    selector: 'nx-org-users',
    templateUrl: 'org-users.component.html',
    styleUrls: [
        'org-users.component.scss',
        '../../../organizations/cards-container/org-cards-container.component.scss',
    ],
    standalone: true,
    imports: [CommonModule, NxUsersTableComponent, TranslateModule],
})
export class NxOrganizationUsersComponent implements OnInit {
    LANG = staticLang;

    currentOrgId$: Observable<string>;
    headers: HEADER_ITEM[];
    records$: Observable<OrgUserExt[]>;

    constructor(
        private dialogsService: NxDialogsService,
        private CPService: NxChannelPartnersService,
    ) {}

    ngOnInit(): void {
        this.currentOrgId$ = this.CPService.paramStateHandler.state$.pipe(
            map(({ params: { organizationId } }) => organizationId),
            distinctUntilChanged(),
        );
        this.records$ = this.currentOrgId$.pipe(
            switchMap(id => this.CPService.getOrganizationUsers(id)),
            map(users =>
                users.map(user => ({
                    ...user,
                    userId: user.email,
                    fullName: 'N/A',
                    accessLevel: ['N/A'],
                })),
            ),
        );
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

    newUserDialog(orgId: string): void {
        this.dialogsService.addOrgUser(orgId);
    }

    deleteOrgUser(email: string): void {
        this.currentOrgId$
            .pipe(
                switchMap(id => this.CPService.deleteOrganizationUser(id, email)),
                catchError(err => {
                    throw err;
                }),
            )
            .subscribe({
                error: err => console.error(err),
            });
    }
}
