import { CommonModule } from '@angular/common';
import { Component, DestroyRef, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { Store } from '@ngrx/store';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

import { selectCurrentOrganization } from '@common/store/channel-partners/channel-partners.selectors';
import { DIALOG_SIZE } from '@dialogs/dialog-config-v2';
import { NxDialogsService } from '@dialogs/dialogs.service';
import staticLang from '@language_static';
import { HEADER_ITEM } from '@pages/home/home.types';
import { GroupsStore } from '@pages/home/store/groups/groups.store';
import { OrgUsersStore } from '@pages/home/store/org-users/org-users.store';
import { ChannelPartnersRouteState } from '@pages/home/store/route-state/route-state.store';
import { NxChannelPartnersService } from '@services/channel-partners.service';

import { NxUsersTableComponent } from '../../users-table/users-table.component';
import { UserRecord, UserType } from '../channel-partner-users/channel-partner-users.types';

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
export class NxOrganizationUsersComponent {
    LANG = staticLang;
    UserType = UserType;
    orgUserStore = inject(OrgUsersStore);
    groupsStore = inject(GroupsStore);
    routerState = inject(ChannelPartnersRouteState);

    inGroup$$ = computed(() => !!this.routerState.groupId());
    headers: HEADER_ITEM[] = [
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

    currentOrg$$ = this.store.selectSignal(selectCurrentOrganization);
    rootGroups$$ = this.groupsStore.groupsEntities;
    orgRoles$$ = toSignal(this.CPService.getOrganizationRoles());
    selectedUsers: { [key: string]: UserRecord } = {};
    destroyRef = inject(DestroyRef);

    constructor(
        private dialogsService: NxDialogsService,
        private CPService: NxChannelPartnersService,
        private store: Store,
        private translateService: TranslateService,
    ) {
        this.orgUserStore.setSelectedGroup(this.routerState.groupId);
        this.orgUserStore.setGroups(this.groupsStore.currentGroups$$);
    }

    // ngOnInit(): void {
    //     iif(
    //         () => this.inGroup,
    //         this.CPService.getGroupUsersWithAccess(this.currentItemId$$()).pipe(
    //             map(users => mapGroupUsers(users)),
    //         ),
    //         this.CPService.getOrganizationUsers(this.currentItemId$$()).pipe(
    //             map(users => mapOrgUsers(users, this.groupItems$$())),
    //         ),
    //     ).subscribe(users => this.orgUserStore.setUsers(users));
    // }

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
            .confirm(
                {
                    message,
                    title: this.LANG.channelPartners.usersTable.deleteDialog.title,
                    footer: {
                        actionLabel:
                            this.LANG.channelPartners.usersTable.deleteDialog.footer.actionLabel,
                        cancelLabel:
                            this.LANG.channelPartners.usersTable.deleteDialog.footer.cancelLabel,
                        buttonClass: 'btn-danger',
                    },
                },
                { width: DIALOG_SIZE.MICRO_SMALL },
            )
            .then(confirm => {
                if (confirm) {
                    const orgId = this.routerState.organizationId();
                    const folderId = this.routerState.groupId();
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
}
