import { CommonModule } from '@angular/common';
import { Component, Input, OnInit, Signal, booleanAttribute } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { Store } from '@ngrx/store';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { map, Observable, take } from 'rxjs';

import { NxDialogsService } from '@dialogs/dialogs.service';
import staticLang from '@language_static';
import { HEADER_ITEM } from '@pages/home/home.types';
import { NxChannelPartnersService } from '@pages/home/services/channel-partners.service';
import {
    selectCurrentOrgId,
    selectCurrentOrganization,
} from '@pages/home/store/channel-partners/channel-partners.selectors';
import {
    selectCurrentGroupId,
    selectCurrentGroups,
    selectGroupItems,
} from '@pages/home/store/groups/groups.selectors';
import {
    GroupItem,
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
        isOrgUser: user.hasAccessTo?.membershipType === 'organization',
        accessLevel: user.hasAccessTo,
        userType: UserType.GROUP,
    }));
};

const mapOrgUsers = (users: OrganizationUser[], groups: GroupItem[]): UserRecord[] => {
    const isOrgUser = (user: OrganizationUser): boolean => {
        // Still needs clarification on all ways to see if user is from org
        return user.roles.includes('Administrator') || !user.groupRoles.length;
    };
    return users.map(user => ({
        ...user,
        groupRoles: user.groupRoles.map(group => ({
            ...group,
            name: groups.find(groupItem => groupItem.id === group.groupId)?.name,
        })),
        userId: user.email,
        isOrgUser: isOrgUser(user),
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
    currentOrg$$ = this.store.selectSignal(selectCurrentOrganization);
    currentGroups$$ = this.store.selectSignal(selectCurrentGroups);
    orgRoles$$ = toSignal(this.CPService.getOrganizationRoles());
    groupItems$$ = this.store.selectSignal(selectGroupItems);

    constructor(
        private dialogsService: NxDialogsService,
        private CPService: NxChannelPartnersService,
        private store: Store,
        private translateService: TranslateService,
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
                  map(users => mapOrgUsers(users, this.groupItems$$())),
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
        const roles = this.orgRoles$$();
        const org = this.currentOrg$$();
        // Currently only shows child groups in dialog
        const groups: GroupItem[] = this.currentGroups$$();
        if (org) {
            this.records$.pipe(take(1)).subscribe(users => {
                this.dialogsService
                    .addOrgUserV2({ organization: org, roles, users, groups })
                    .then(user => {
                        const userRecord = this.inGroup
                            ? mapGroupUsers([user as GroupUserCanAccess])
                            : mapOrgUsers([user as OrganizationUser], this.groupItems$$());
                        this.records$ = this.records$.pipe(
                            map(records => {
                                records.push(...userRecord);
                                return records;
                            }),
                        );
                    });
            });
        }
    }

    deleteSingleUser(user: UserRecord): void {
        this.dialogsService
            .confirm({
                message: this.translateService.instant(
                    this.LANG.channelPartners.usersTable.deleteDialog.singleMessage,
                    {
                        name: user.fullName,
                    },
                ),
                title: this.LANG.channelPartners.usersTable.deleteDialog.title,
                footer: {
                    actionLabel:
                        this.LANG.channelPartners.usersTable.deleteDialog.footer.actionLabel,
                    cancelLabel:
                        this.LANG.channelPartners.usersTable.deleteDialog.footer.cancelLabel,
                    buttonClass: 'btn-danger',
                },
            })
            .then(confirm => {
                if (confirm) {
                    const { email, isOrgUser } = user;
                    if (!isOrgUser) {
                        if (this.inGroup) {
                            this.CPService.deleteGroupUsers(this.currentItemId$$(), [
                                email,
                            ]).subscribe({
                                error: err => console.error(err),
                            });
                        } else {
                            for (const group of user.groupRoles) {
                                const groupId = group.groupId;
                                this.CPService.deleteGroupUsers(groupId, [email]).subscribe({
                                    error: err => console.error(err),
                                });
                            }
                        }
                    } else {
                        this.CPService.deleteOrganizationUser(
                            this.currentItemId$$(),
                            email,
                        ).subscribe({
                            error: err => console.error(err),
                        });
                    }
                    this.records$ = this.records$.pipe(
                        map(users => users.filter(user => user.email !== email)),
                    );
                }
            });
    }

    expandClick(user: UserRecord): void {}
}
