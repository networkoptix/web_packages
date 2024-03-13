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
import { iif, map } from 'rxjs';

import { selectCurrentOrganization } from '@common/store/channel-partners/channel-partners.selectors';
import { NxDialogsService } from '@dialogs/dialogs.service';
import staticLang from '@language_static';
import { HEADER_ITEM } from '@pages/home/home.types';
import { GroupsStore } from '@pages/home/store/groups/groups.store';
import { OrgUsersStore } from '@pages/home/store/org-users/org-users.store';
import { NxChannelPartnersService } from '@services/channel-partners.service';
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
    orgUserStore = inject(OrgUsersStore);
    groupsStore = inject(GroupsStore);

    @Input({ transform: booleanAttribute }) inGroup: boolean;
    headers: HEADER_ITEM[];

    currentItemId$$ = signal<string>('');
    currentOrg$$ = this.store.selectSignal(selectCurrentOrganization);
    rootGroups$$ = this.groupsStore.groupsEntities;
    orgRoles$$ = toSignal(this.CPService.getOrganizationRoles());
    groupItems$$ = this.groupsStore.currentGroups$$;
    selectedUsers: { [key: string]: UserRecord } = {};
    destroyRef = inject(DestroyRef);

    constructor(
        private dialogsService: NxDialogsService,
        private CPService: NxChannelPartnersService,
        private store: Store,
        private translateService: TranslateService,
        private router: Router,
        private route: ActivatedRoute,
    ) {
        this.orgUserStore.setSelectedGroup(this.currentItemId$$);
        this.orgUserStore.setGroups(this.groupItems$$);
    }

    ngOnInit(): void {
        this.CPService.paramStateHandler.state$
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe(({ params }) => {
                this.currentItemId$$.set(params.groupId || params.organizationId);
            });
        iif(
            () => this.inGroup,
            this.CPService.getGroupUsersWithAccess(this.currentItemId$$()).pipe(
                map(users => mapGroupUsers(users)),
            ),
            this.CPService.getOrganizationUsers(this.currentItemId$$()).pipe(
                map(users => mapOrgUsers(users, this.groupItems$$())),
            ),
        ).subscribe(users => this.orgUserStore.setUsers(users));
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

    newUserDialog(): void {
        const roles = this.orgRoles$$() || [];
        const org = this.currentOrg$$();
        const groups = this.rootGroups$$() || [];
        if (org) {
            this.dialogsService.addOrgUserV2({
                organization: org,
                users: this.orgUserStore.tableUsers$$(),
                roles,
                groups,
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
                      name: user.fullName || user.email,
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
                    const orgId = this.currentOrg$$().id;
                    const folderId = this.currentItemId$$();
                    if (deleteMultiple) {
                        this.orgUserStore.removeUsers(
                            orgId,
                            folderId,
                            Object.keys(this.selectedUsers),
                        );
                    } else {
                        this.orgUserStore.removeUser(orgId, folderId, user.email);
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
