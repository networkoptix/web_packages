import { Component, Output, computed, inject, input } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';

import * as cpActions from '@common/store/channel-partners/channel-partners.actions';
import { NxCheckAllContainerDirective } from '@components/checkbox/checkbox-check-all-container.directive';
import { NxCheckAllDirective } from '@components/checkbox/checkbox-check-all.directive';
import { NxPreLoaderComponent } from '@components/placeholders/pre-loader/pre-loader.component';
import { NxSearchHighlightComponent } from '@components/search-highlight/search-highlight.component';
import { NxSelectV2Module } from '@components/select-v2/select-v2.module';
import { DIALOG_SIZE } from '@dialogs/dialog-config-v2';
import { ChannelPartnerUsersStore } from '@pages/home/components/users/channel-partner-users/channel-partner-users.store';
import {
    UserRecord,
    UserType,
} from '@pages/home/components/users/channel-partner-users/channel-partner-users.types';
import { HEADER_ITEM } from '@pages/home/home.types';
import { NxAccountService } from '@services/account.service';
import { ChannelPartnerRoleIds } from '@services/nx-cloud-api/cloud-services/channel-partners/channel-partners-api.types';
import {
    selectCurrentPartner,
    selectRootChannelPartners,
} from '@store/channel-partners/channel-partners.selectors';

import { StranglerImports } from '../abstract-user-table/abstract-user-table-imports';
import { AbstractUserTableDirective } from '../abstract-user-table/abstract-user-table.directive';

@Component({
    selector: 'nx-channel-partner-users-table',
    templateUrl: './channel-partner-users-table.component.html',
    styleUrls: ['../abstract-user-table/abstract-user-table.component.scss'],
    standalone: true,
    imports: [
        StranglerImports,
        NxSelectV2Module,
        NxCheckAllContainerDirective,
        NxCheckAllDirective,
        NxSearchHighlightComponent,
        NxPreLoaderComponent,
    ],
})
export class NxChannelPartnersUsersTableComponent extends AbstractUserTableDirective {
    protected accountService = inject(NxAccountService);
    protected router = inject(Router);
    protected channelPartnerUsersStore = inject(ChannelPartnerUsersStore);

    ChannelPartnerRoleIds = ChannelPartnerRoleIds;
    channelPartnerUserRecords$$ = this.channelPartnerUsersStore.entities;
    filteredRecords$$ = this.channelPartnerUsersStore.filteredRecords$$;
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
    idPropName = 'userId';
    roles$$ = toSignal(this.cpService.getChannelPartnerRoles());
    channelPartners$$ = this.store.selectSignal(selectRootChannelPartners);
    currentPartner$$ = this.store.selectSignal(selectCurrentPartner);
    searching = input.required<boolean>();
    searchingQuery$$ = computed(() => this.channelPartnerUsersStore.searchQuery());

    selectedCount$$ = computed(() => this.checkAllContainer$$()?.toggledCount$$() || 0);
    selectedUsers$$ = computed(
        () =>
            this.checkAllContainer$$()
                ?.otherCheckBoxesData$$()
                ?.filter(row => row.selected)
                .map(row => row.data as UserRecord) || [],
    );
    selectedChannelPartnerUsersMap$$ = computed(
        () => new Map(this.selectedUsers$$()?.map((row: UserRecord) => [row.email, true]) || []),
    );
    @Output() public selectedCountEmitter = toObservable<number | undefined>(this.selectedCount$$);

    canManageUsers$$ = computed(() => this.permissionStore.canViewPartnerUsers$$());

    hasOneAdmin$$ = computed(() => {
        const users = this.channelPartnerUserRecords$$();
        let count = 0;
        for (const user of users) {
            if (user.rolesIds.includes(ChannelPartnerRoleIds.ADMINISTRATOR)) {
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
            this.channelPartnerUserRecords$$().find(user =>
                user.rolesIds.includes(ChannelPartnerRoleIds.ADMINISTRATOR),
            )?.email || ''
        );
    });

    adminCount$$ = computed(() => {
        const adminUsers = this.channelPartnerUserRecords$$()?.filter(user =>
            user.rolesIds.includes(ChannelPartnerRoleIds.ADMINISTRATOR),
        );
        return adminUsers?.length || 0;
    });

    updateRole(user: UserRecord, roleId: string): void {
        const currPartner = this.currentPartner$$();
        this.cpService
            .updateChannelPartnerUser(currPartner.id, {
                roleId,
                email: user.email,
            })
            .subscribe(updatedUser => {
                const staleUser: UserRecord | undefined = this.filteredRecords$$().find(
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
                    const permissions = this.roles$$()!.find(
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

    getRowRoleId(user: UserRecord): string {
        return user?.rolesIds[0] ?? '';
    }

    getDisplayRole(user: UserRecord): string {
        return user?.roles?.[0] ?? '';
    }

    showRole(row: UserRecord): boolean {
        if (!this.canManageUsers$$()) {
            return true;
        }
        const userIsOnlyAdmin = this.onlyAdmin$$() === row.userId;
        return this.hasMultipleRoles(row) || userIsOnlyAdmin;
    }

    newUserDialog = (): void => {
        this.dialogService
            .addPartnerUser({
                partnerId: this.currentPartner$$()?.id,
                users: this.filteredRecords$$(),
            })
            .then(user => {
                this.channelPartnerUsersStore.addRecord({
                    ...user,
                    userId: user.email,
                    userType: UserType.CHANNEL_PARTNER,
                });
            });
    };

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
                    title: this.LANG.channelPartners.usersTable.deleteDialog.delete,
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
        const adminUsers = this.selectedUsers$$()?.filter(user =>
            user.rolesIds.includes(ChannelPartnerRoleIds.ADMINISTRATOR),
        );

        if (adminUsers?.length === this.adminCount$$()) {
            this.store.dispatch(
                cpActions.showBannerAction({
                    banner: {
                        message: this.LANG.channelPartners.usersTable.adminWarning,
                        icon: 'error.svg',
                        type: 'error',
                        page: 'channel-partner',
                    },
                }),
            );
            return;
        }
        const selectedUsers = this.selectedCount$$();
        const message =
            selectedUsers > 1
                ? this.translateService.instant(
                      this.LANG.channelPartners.usersTable.deleteDialog.multipleMessage,
                      { count: selectedUsers },
                  )
                : this.translateService.instant(
                      this.LANG.channelPartners.usersTable.deleteDialog.channelPartner
                          .singleMessage,
                      {
                          email: this.selectedUsers$$()[0].email,
                          permission: this.selectedUsers$$()[0].roles[0],
                      },
                  );
        this.dialogService
            .confirm(
                {
                    message,
                    title: this.LANG.channelPartners.usersTable.deleteDialog.delete,
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
