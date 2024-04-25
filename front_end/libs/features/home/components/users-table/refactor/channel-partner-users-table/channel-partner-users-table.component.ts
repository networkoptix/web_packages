import { Component, Output, ViewChild, computed, forwardRef, inject, input } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { TranslateService } from '@ngx-translate/core';
import { BehaviorSubject } from 'rxjs';

import * as cpActions from '@common/store/channel-partners/channel-partners.actions';
import { NxCheckAllContainerDirective } from '@components/checkbox/checkbox-check-all-container.directive';
import { NxCheckAllDirective } from '@components/checkbox/checkbox-check-all.directive';
import { NxSelectV2Module } from '@components/select-v2/select-v2.module';
import { DIALOG_SIZE } from '@dialogs/dialog-config-v2';
import { NxDialogsService } from '@dialogs/dialogs.service';
import { ChannelPartnerUsersStore } from '@pages/home/components/users/channel-partner-users/channel-partner-users.store';
import { UserRecord } from '@pages/home/components/users/channel-partner-users/channel-partner-users.types';
import { HEADER_ITEM } from '@pages/home/home.types';

import { InitialUserTable } from '../strangler-table/initial-user-table';
import { StranglerImports } from '../strangler-table/strangler-imports';
@Component({
    selector: 'nx-channel-partner-users-table',
    templateUrl: './channel-partner-users-table.component.html',
    styleUrls: ['../strangler-table/strangler-table.component.scss'],
    standalone: true,
    imports: [
        StranglerImports,
        NxSelectV2Module,
        NxCheckAllContainerDirective,
        NxCheckAllDirective,
    ],
})
export class NxChannelPartnersUsersTableComponent extends InitialUserTable {
    dialogService = inject(NxDialogsService);
    translateService = inject(TranslateService);
    channelPartnerUsersStore = inject(ChannelPartnerUsersStore);

    channelPartnerUserRecords = input.required<UserRecord[]>({ alias: 'records' });
    headers: HEADER_ITEM[] = [
        {
            name: 'email',
            value: this.LANG.channelPartners.usersTableHeaders.email,
            sort: 'string',
        },
        {
            name: 'fullName',
            value: this.LANG.channelPartners.usersTableHeaders.fullName,
            sort: 'string',
        },
        { name: 'groups', value: this.LANG.channelPartners.usersTableHeaders.groups },
    ];
    setArrange = ['userId', 'email', 'fullName', 'roles', 'delete'];
    roles$$ = toSignal(this.cpService.getChannelPartnerRoles());

    checkAllContainer = new BehaviorSubject<null | NxCheckAllContainerDirective>(null);
    checkAllContainer$$ = toSignal(this.checkAllContainer, { initialValue: null });
    @ViewChild(forwardRef(() => 'containerRef')) set setContainerRef(
        checkAllContainerRef: NxCheckAllContainerDirective,
    ) {
        this.checkAllContainer.next(checkAllContainerRef);
    }
    selectedCount$$ = computed(() => this.checkAllContainer$$()?.toggledCount$$() || 0);
    selectedUsers$$ = computed(
        () =>
            this.checkAllContainer$$()
                ?.otherCheckBoxesData$$()
                ?.filter(row => row.selected)
                .map(row => row.data) || [],
    );
    selectedChannelPartnerUsersMap$$ = computed(
        () => new Map(this.selectedUsers$$()?.map((row: UserRecord) => [row.email, true]) || []),
    );
    @Output() public selectedCountEmitter = toObservable<number | undefined>(this.selectedCount$$);

    canManageUsers$$ = computed(() => this.permissionStore.canViewPartnerUsers$$());

    hasOneAdmin$$ = computed(() => {
        const users = this.channelPartnerUserRecords();
        let count = 0;
        for (const user of users) {
            if (user.roles[0] === 'Administrator') {
                count += 1;
                if (count >= 2) {
                    return false;
                }
            }
        }
        return true;
    });

    onlyAdmin$$ = computed(() => {
        if (!this.hasOneAdmin$$()) {
            return '';
        }
        return (
            this.channelPartnerUserRecords().find(user => user.roles[0] === 'Administrator')
                ?.email || ''
        );
    });

    updateRole(user: UserRecord, roleId: string): void {
        const currPartner = this.currentPartner$$();
        this.cpService
            .updateChannelPartnerUser(currPartner.id, {
                roleId,
                email: user.email,
            })
            .subscribe(updatedUser => {
                const staleUser: UserRecord | undefined = this.channelPartnerUserRecords().find(
                    ({ email }) => email === user.email,
                );
                if (staleUser) {
                    const { roles, rolesIds } = updatedUser;
                    staleUser.roles = roles;
                    staleUser.rolesIds = rolesIds;
                    this.channelPartnerUsersStore.updateRecord(user.userId, staleUser);
                }
                const email = this.accountService.email;
                if (updatedUser.email === email) {
                    const channelPartners = structuredClone(this.channelPartners$$());
                    const currPartnerIndex = channelPartners.findIndex(
                        partner => partner.id === currPartner.id,
                    );
                    const permissions = this.roles.find(
                        role => role.name === updatedUser.roles[0],
                    )?.permissions;
                    channelPartners[currPartnerIndex] = {
                        ...channelPartners[currPartnerIndex],
                        ownPermissions: permissions,
                        ownRoles: updatedUser.roles,
                    };
                    this.store.dispatch(cpActions.setChannelPartners({ channelPartners }));
                    this.router.navigate(['home', 'channelPartners', this.currentPartner$$().id]);
                }
            });
    }

    getRowRoleId(row: UserRecord): string {
        const displayRole = row.roles[0];
        return this.roles$$()?.find(role => role.name === displayRole)?.id;
    }

    deleteUser(user: UserRecord): void {
        this.dialogService
            .confirm(
                {
                    message: this.translateService.instant(
                        this.LANG.channelPartners.usersTable.deleteDialog.channelPartner
                            .singleMessage,
                        {
                            email: user.email,
                            permission: user.roles[0],
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
                },
                { width: DIALOG_SIZE.MICRO_SMALL },
            )
            .then(confirm => {
                if (confirm) {
                    this.cpService
                        .deleteChannelPartnerUser(this.currentPartner$$()?.id, user.email)
                        .subscribe(_ => {
                            this.channelPartnerUsersStore.removeRecord(user.email);
                        });
                }
            });
    }

    bulkDeleteUsers(): void {
        this.dialogService
            .confirm(
                {
                    message: this.translateService.instant(
                        this.LANG.channelPartners.usersTable.deleteDialog.multipleMessage,
                        { count: this.selectedCount$$() },
                    ),
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
                    const users = this.selectedUsers$$()?.map((user: UserRecord) => user.email);
                    this.cpService
                        .bulkDeleteChannelPartnerUsers(this.currentPartner$$()?.id, users)
                        .subscribe({
                            next: ({ emails }) => {
                                this.channelPartnerUsersStore.removeRecords(emails);
                            },
                            error: err => console.error(err),
                        });
                }
            });
    }
}
