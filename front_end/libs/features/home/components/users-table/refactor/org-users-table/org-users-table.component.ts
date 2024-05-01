import { Component, Output, ViewChild, computed, inject, input } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { TranslateService } from '@ngx-translate/core';
import { BehaviorSubject } from 'rxjs';

import { NxCheckAllContainerDirective } from '@components/checkbox/checkbox-check-all-container.directive';
import { NxCheckAllDirective } from '@components/checkbox/checkbox-check-all.directive';
import { NxSelectV2Module } from '@components/select-v2/select-v2.module';
import { DIALOG_SIZE } from '@dialogs/dialog-config-v2';
import { NxDialogsService } from '@dialogs/dialogs.service';
import { UserRecord } from '@pages/home/components/users/channel-partner-users/channel-partner-users.types';
import { OrgUsersStore } from '@pages/home/store/org-users/org-users.store';

import { InitialUserTable } from '../strangler-table/initial-user-table';
import { StranglerImports } from '../strangler-table/strangler-imports';

@Component({
    selector: 'nx-org-users-table',
    templateUrl: './org-users-table.component.html',
    styleUrls: ['../strangler-table/strangler-table.component.scss'],
    standalone: true,
    imports: [
        StranglerImports,
        NxCheckAllContainerDirective,
        NxCheckAllDirective,
        NxSelectV2Module,
    ],
})
export class NxOrgUsersTableComponent extends InitialUserTable {
    dialogService = inject(NxDialogsService);
    translateService = inject(TranslateService);
    override orgUsersStore = inject(OrgUsersStore);

    roles$$ = this.cpService.organizationRoles$$;
    orgUserRecords = input.required<UserRecord[]>({ alias: 'records' });
    hasOnlyOneAdmin$$ = computed(() => {
        const users = this.orgUserRecords();
        let foundAdmin = false;
        for (const user of users) {
            if (['Organization Administrator', 'Administrator'].includes(user.roles[0])) {
                if (foundAdmin) {
                    return false;
                }
                foundAdmin = true;
            }
        }
        return true;
    });

    onlyAdmin$$ = computed(() => {
        if (!this.hasOnlyOneAdmin$$()) {
            return null;
        }
        const a = this.orgUserRecords().find(user =>
            ['Organization Administrator', 'Administrator'].includes(user.roles[0]),
        ).email;
        return a;
    });
    inGroup$$ = computed(() => this.currentGroupId$$() !== this.currentOrg$$().id);

    checkAllContainer = new BehaviorSubject<undefined | NxCheckAllContainerDirective>(undefined);
    checkAllContainer$$ = toSignal(this.checkAllContainer, { initialValue: null });
    @ViewChild(NxCheckAllContainerDirective) set setContainerRef(
        checkAllContainerRef: NxCheckAllContainerDirective,
    ) {
        this.checkAllContainer.next(checkAllContainerRef);
    }
    selectedCount$$ = computed(() => this.checkAllContainer$$()?.toggledCount$$());
    @Output() public selectedCountEmitter = toObservable<number | undefined>(this.selectedCount$$);
    selectedOrgUsers$$ = computed(() =>
        this.checkAllContainer$$()
            ?.otherCheckBoxesData$$()
            ?.filter(row => row.selected)
            .map(row => row.data),
    );
    selectedOrgUsersMap$$ = computed(
        () => new Map(this.selectedOrgUsers$$()?.map((user: UserRecord) => [user.email, user])),
    );

    override canManageUsers$$ = computed(() => this.permissionStore.canViewOrgUsers$$());

    override getRowRoleId(user: UserRecord): string {
        return this.roles$$()
            .find(role => role.name === this.getDisplayRole(user))
            ?.id.toString();
    }

    override getDisplayRole(user: UserRecord): string {
        let displayRole = user.roles[0];
        if (!this.inGroup$$() && !user.isOrgUser) {
            displayRole = user.groupRoles?.length > 1 ? 'Multiple' : user.groupRoles[0].roles[0];
        }
        return displayRole;
    }

    canUpdateUserRole(user: UserRecord): boolean {
        if (!this.canManageUsers$$()) {
            return false;
        }
        const currentGroupId = this.currentGroupId$$();
        const orgId = this.currentOrg$$()?.id;
        const userIsOnlyAdmin = this.hasOnlyOneAdmin$$() && this.onlyAdmin$$() === user.email;
        return (
            (user.isOrgUser && !userIsOnlyAdmin && currentGroupId === orgId) ||
            (!user.isOrgUser && !this.hasMultipleRoles(user))
        );
    }

    override updateRole(user: UserRecord, roleId: string): void {
        const folder = user?.groupRoles?.[0]?.groupId || user.accessLevel?.id || '';
        this.orgUsersStore.updateUser(this.currentOrg$$().id, folder, user.email, roleId);
    }

    deleteUser(user: UserRecord): void {
        this.dialogService
            .confirm(
                {
                    message: this.translateService.instant(
                        this.LANG.channelPartners.usersTable.deleteDialog.singleMessage,
                        {
                            name: user.email,
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
                    const currOrgId = this.currentOrg$$().id;
                    if (user.isOrgUser) {
                        this.orgUsersStore.removeUser(currOrgId, user.email);
                    } else {
                        if (this.inGroup$$()) {
                            this.orgUsersStore.removeUser(currOrgId, user.email, [
                                this.currentGroupId$$(),
                            ]);
                        } else {
                            this.orgUsersStore.removeUser(currOrgId, user.email);
                        }
                    }
                }
            });
    }

    bulkDeleteUsers(): void {
        this.dialogService
            .confirm(
                {
                    message: this.translateService.instant(
                        this.LANG.channelPartners.usersTable.deleteDialog.multipleMessage,
                        {
                            count: this.selectedCount$$(),
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
                    const currOrgId = this.currentOrg$$()?.id;
                    this.orgUsersStore.removeUsers(
                        currOrgId,
                        currOrgId,
                        this.selectedOrgUsers$$()?.map((user: UserRecord) => user.email),
                    );
                }
            });
    }
}
