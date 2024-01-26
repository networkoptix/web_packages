import { CommonModule } from '@angular/common';
import {
    Component,
    DestroyRef,
    Input,
    OnInit,
    booleanAttribute,
    inject,
    signal,
} from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { map, Observable, take, zip } from 'rxjs';

import { NxDialogsService } from '@dialogs/dialogs.service';
import staticLang from '@language_static';
import { HEADER_ITEM } from '@pages/home/home.types';
import { NxChannelPartnersService } from '@pages/home/services/channel-partners.service';
import { selectCurrentOrganization } from '@pages/home/store/channel-partners/channel-partners.selectors';
import { selectCurrentGroups, selectGroupItems } from '@pages/home/store/groups/groups.selectors';
import {
    GroupItem,
    GroupUser,
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
        return user.roles?.includes('Administrator') || !user.groupRoles?.length;
    };
    return users.map(user => ({
        ...user,
        groupRoles: user?.groupRoles?.map(group => ({
            ...group,
            name: groups?.find(groupItem => groupItem.id === group.groupId)?.name,
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

    currentItemId$$ = signal<string>('');
    currentOrg$$ = this.store.selectSignal(selectCurrentOrganization);
    currentGroups$$ = this.store.selectSignal(selectCurrentGroups);
    orgRoles$$ = toSignal(this.CPService.getOrganizationRoles());
    groupItems$$ = this.store.selectSignal(selectGroupItems);
    selectedUsers: { [key: string]: UserRecord } = {};
    destroyRef = inject(DestroyRef);

    constructor(
        private dialogsService: NxDialogsService,
        private CPService: NxChannelPartnersService,
        private store: Store,
        private translateService: TranslateService,
        private router: Router,
        private route: ActivatedRoute,
    ) {}

    ngOnInit(): void {
        this.CPService.paramStateHandler.state$
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe(({ params }) => {
                this.currentItemId$$.set(params.groupId || params.organizationId);
            });

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

    deleteUsers(user: UserRecord): void {
        const selectedUsersLength = Object.keys(this.selectedUsers).length;
        const deleteMultiple = selectedUsersLength > 1;
        const message = deleteMultiple
            ? this.translateService.instant(
                  this.LANG.channelPartners.usersTable.deleteDialog.multipleMessage,
                  {
                      count: selectedUsersLength,
                  },
              )
            : this.translateService.instant(
                  this.LANG.channelPartners.usersTable.deleteDialog.singleMessage,
                  {
                      name: user.fullName,
                  },
              );
        this.dialogsService
            .confirm({
                message,
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
                    const requests: Observable<OrganizationUser[] | GroupUser[] | void>[] = [];
                    if (deleteMultiple) {
                        const isOrgUser = (user: UserRecord): boolean => {
                            return user.isOrgUser;
                        };
                        const partition = (
                            arr: UserRecord[],
                            isOrgUser: (user: UserRecord) => boolean,
                        ): { orgUsers: UserRecord[]; groupUsers: UserRecord[] } => {
                            return arr.reduce(
                                (acc, user) => {
                                    if (isOrgUser(user)) {
                                        acc.orgUsers.push(user);
                                    } else {
                                        acc.groupUsers.push(user);
                                    }
                                    return acc;
                                },
                                { orgUsers: [], groupUsers: [] },
                            );
                        };

                        const { orgUsers, groupUsers } = partition(
                            Object.values(this.selectedUsers),
                            isOrgUser,
                        );
                        if (orgUsers.length) {
                            requests.push(
                                this.CPService.deleteBulkOrganizationUsers(
                                    this.currentItemId$$(),
                                    orgUsers.map(user => `${user.email}asd`),
                                ),
                            );
                        }

                        if (this.inGroup && groupUsers.length) {
                            requests.push(
                                this.CPService.deleteBulkGroupUsers(
                                    this.currentItemId$$(),
                                    groupUsers.map(user => user.email),
                                ),
                            );
                        } else {
                            const groupMap: { [key: string]: string[] } = {};
                            for (const user of groupUsers) {
                                for (const group of user.groupRoles) {
                                    const { groupId } = group;
                                    if (!groupMap[groupId]) {
                                        groupMap[groupId] = [];
                                    }
                                    groupMap[groupId].push(user.email);
                                }
                            }

                            Object.entries(groupMap).forEach(([id, users]) =>
                                requests.push(this.CPService.deleteBulkGroupUsers(id, users)),
                            );
                        }
                        const usersMap = new Map<string, boolean>(
                            Object.keys(this.selectedUsers).map(user => [user, true]),
                        );
                        zip(requests).subscribe(_ => {
                            this.records$ = this.records$.pipe(
                                map(users => users.filter(user => !usersMap.has(user.email))),
                            );
                        });
                    } else {
                        const { email, isOrgUser } = user;
                        if (!isOrgUser) {
                            if (this.inGroup) {
                                requests.push(
                                    this.CPService.deleteBulkGroupUsers(this.currentItemId$$(), [
                                        email,
                                    ]),
                                );
                            } else {
                                user.groupRoles?.forEach(({ groupId }) => {
                                    requests.push(
                                        this.CPService.deleteBulkGroupUsers(groupId, [email]),
                                    );
                                });
                            }
                        } else {
                            requests.push(
                                this.CPService.deleteOrganizationUser(
                                    this.currentItemId$$(),
                                    email,
                                ),
                            );
                        }
                        zip(requests).subscribe({
                            next: _ => {
                                this.records$ = this.records$.pipe(
                                    map(users => users.filter(user => user.email !== email)),
                                );
                            },
                            error: err => {
                                console.error(err);
                            },
                        });
                    }
                }
            });
    }

    updateSelectedUsers(users: { [key: string]: UserRecord }): void {
        this.selectedUsers = users;
    }
    expandClick(user: UserRecord): void {
        this.router.navigate([user.email], { relativeTo: this.route });
    }
}
