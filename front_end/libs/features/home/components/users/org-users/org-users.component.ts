import { CommonModule } from '@angular/common';
import { Component, Input, OnInit, Signal, booleanAttribute } from '@angular/core';
import { Store } from '@ngrx/store';
import { TranslateModule } from '@ngx-translate/core';
import { map, Observable } from 'rxjs';

import { NxDialogsService } from '@dialogs/dialogs.service';
import staticLang from '@language_static';
import { HEADER_ITEM } from '@pages/home/home.types';
import { NxChannelPartnersService } from '@pages/home/services/channel-partners.service';
import { selectCurrentOrgId } from '@pages/home/store/channel-partners/channel-partners.selectors';
import { selectCurrentGroupId } from '@pages/home/store/groups/groups.selectors';
import {
    GroupUserCanAccess,
    OrganizationUser,
} from '@services/nx-cloud-api/cloud-services/channel-partners/channel-partners-api.types';

import { NxUsersTableComponent } from '../../users-table/users-table.component';
import { UserRecord, UserType } from '../channel-partner-users/channel-partner-users.types';

const mapGroupUsers = (users: GroupUserCanAccess[]): UserRecord[] => {
    return users.map(user => ({
        email: user.email,
        userId: user.email,
        fullName: 'N/A',
        roles: user.roles,
        showOrg: user.hasAccessTo?.membershipType === 'organization',
        accessLevel: user.hasAccessTo,
        userType: UserType.GROUP,
    }));
};

const mapOrgUsers = (users: OrganizationUser[]): UserRecord[] => {
    const showOrg = (user: OrganizationUser): boolean => {
        // Still needs clarification on all ways to see if user is from org
        return user.roles.includes('Administrator');
    };
    return users.map(user => ({
        ...user,
        userId: user.email,
        fullName: 'N/A',
        showOrg: showOrg(user),
        userType: UserType.ORGANIZATION,
    }));
};

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
    UserType = UserType;

    @Input({ transform: booleanAttribute }) inGroup: boolean;
    headers: HEADER_ITEM[];
    records$: Observable<UserRecord[]>;

    currentItemId$$: Signal<string>;

    constructor(
        private dialogsService: NxDialogsService,
        private CPService: NxChannelPartnersService,
        private store: Store,
    ) {}

    ngOnInit(): void {
        this.currentItemId$$ = this.store.selectSignal(
            this.inGroup ? selectCurrentGroupId : selectCurrentOrgId,
        );
        this.records$ = this.inGroup
            ? this.CPService.getGroupUsersWithAccess(this.currentItemId$$()).pipe(
                  map(users => mapGroupUsers(users)),
              )
            : this.CPService.getOrganizationUsers(this.currentItemId$$()).pipe(
                  map(users => mapOrgUsers(users)),
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
        // Todo: Add support for adding group user
        this.dialogsService.addOrgUser(orgId);
    }

    deleteSingleUser(email: string): void {
        if (this.inGroup) {
            this.CPService.deleteOrganizationUser(this.currentItemId$$(), email).subscribe({
                error: err => console.error(err),
            });
        } else {
            this.CPService.deleteGroupUsers(this.currentItemId$$(), [email]).subscribe({
                error: err => console.error(err),
            });
        }
    }
}
