import { Component, computed, inject, Output } from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { escape } from 'lodash-es';

import { NxCheckAllContainerDirective } from '@components/checkbox/checkbox-check-all-container.directive';
import { NxCheckAllDirective } from '@components/checkbox/checkbox-check-all.directive';
import { NxPagePlaceholderGenericComponent } from '@components/placeholdersV2/generic-page-placeholder.component';
import { NxPagePlaceholderNoUsersComponent } from '@components/placeholdersV2/no-users/no-users-page-placeholder.component';
import { NxPagePlaceholderNothingFoundComponent } from '@components/placeholdersV2/nothing-found/nothing-found-placeholder.component';
import { NxSelectV2Module } from '@components/select-v2/select-v2.module';
import { NxTooltipV2Directive } from '@directives/tooltip-v2/tooltip-v2.directive';
import { UserRecord } from '@pages/home/components/users/channel-partner-users/channel-partner-users.types';
import { HEADER_ITEM } from '@pages/home/home.types';
import { OrgRoleIds } from '@services/nx-cloud-api/cloud-services/channel-partners/channel-partners-api.types';
import { selectCurrentOrganization } from '@store/channel-partners/channel-partners.selectors';
import { alphaNumericSort, caseInsensitiveSearch } from '@utils/general';
import { paramModel } from '@utils/signals';

import { StranglerImports } from '../abstract-user-table/abstract-user-table-imports';
import { AbstractUserTableDirective } from '../abstract-user-table/abstract-user-table.directive';
@Component({
    selector: 'nx-users-access-table',
    templateUrl: './access-table.component.html',
    styleUrls: [
        './access-table.component.scss',
        '../abstract-user-table/abstract-user-table.component.scss',
    ],
    standalone: true,
    imports: [
        StranglerImports,
        NxCheckAllContainerDirective,
        NxCheckAllDirective,
        NxSelectV2Module,
        NxTooltipV2Directive,
        NxPagePlaceholderNothingFoundComponent,
        NxPagePlaceholderNoUsersComponent,
        NxPagePlaceholderGenericComponent,
    ],
})
export class NxUsersAccessTableComponent extends AbstractUserTableDirective {
    searchQueryModel = paramModel('search');

    currentOrg$$ = this.store.selectSignal(selectCurrentOrganization);
    currAccessLevel = this.currentOrg$$()?.channelPartnerAccessLevel;
    email$$ = this.routerState.email;
    orgRoles$$ = this.cpService.organizationRoles$$;
    accessTableRecords$$ = computed(() => {
        const orgRecords = this.orgUsersStore.usersCacheEntityMap()[''].users as UserRecord[];
        return orgRecords
            .filter(({ email }) => email === this.email$$())
            .flatMap(user => {
                if (!user.isOrgUser) {
                    const groups = this.groupsStore.groupPathMap$$();
                    const email = this.email$$();
                    return user
                        .groupRoles!.map(groupRole => {
                            return {
                                ...user,
                                email,
                                userId: email,
                                groupRoles: [groupRole],
                                roles: groupRole.roles,
                                rolesIds: groupRole.rolesIds,
                                accessId: groupRole.groupId,
                            };
                        })
                        .sort(
                            alphaNumericSort(
                                ({ groupRoles }) => groups[groupRoles[0]?.groupId].pathString,
                            ),
                        );
                }
                user.accessId = this.currentOrg$$()?.id;
                return user;
            });
    });

    filteredRecords$$ = computed(() => {
        const groups = this.groupsStore.groupPathMap$$();
        const searchQuery = this.searchQueryModel();
        const records = this.accessTableRecords$$();

        if (!searchQuery) {
            return records;
        }

        return records.filter(record => {
            const id = record.groupRoles[0].groupId;
            return (
                caseInsensitiveSearch(groups[id].pathString, searchQuery) ||
                record.roles.some((role: string) => caseInsensitiveSearch(role, searchQuery))
            );
        });
    });

    protected idPropName = 'accessId';
    protected groupPropName = 'groupId';
    protected headers: HEADER_ITEM[] = [
        { name: 'accessLevel', value: this.LANG.channelPartners.usersTableHeaders.accessLevel },
        { name: 'groups', value: this.LANG.channelPartners.usersTableHeaders.groups },
    ];
    protected setArrange = ['groupId', 'accessLevel', 'roles', 'delete'];
    router = inject(Router);
    activatedRoute = inject(ActivatedRoute);
    selectedCount$$ = computed(() => this.checkAllContainer$$()?.toggledCount$$());
    selectedGroups$$ = computed(
        () =>
            this.checkAllContainer$$()
                ?.otherCheckBoxInstances$$()
                .filter(row => row.value)
                .map(row => row.data$$()) as UserRecord[],
    );
    selectedGroupsMap$$ = computed(() => {
        const selectedRows = new Map(
            this.checkAllContainer$$()
                ?.otherCheckBoxesData$$()
                ?.filter(row => row.selected)
                .map(row => row.data)
                .map((row: UserRecord) => [this.getGroupId(row), row]),
        );
        return selectedRows;
    });

    @Output() public selectedCountEmitter = toObservable<number | undefined>(this.selectedCount$$);

    fullName$$ = computed(() => {
        const records = this.accessTableRecords$$();
        const email = this.email$$();
        const fullName = records.find(u => u.email === email && u.fullName !== 'N/A')?.fullName;
        if (fullName) {
            return `${fullName}, ${email}`;
        }

        return email;
    });
    canManageUsers$$ = computed(() => {
        if (!this.permissionStore.canViewOrgUsers$$()) {
            return false;
        }
        const users = this.orgUsersStore.tableUsers$$();
        const currentUser = users.find(user => user.email === this.email$$());
        if (this.currAccessLevel === OrgRoleIds.OrgAdmin || !currentUser?.isOrgUser) {
            return true;
        }

        const checkForOneAdmin = (): boolean => {
            let admins = 0;
            for (const user of users) {
                if (user.rolesIds?.includes(OrgRoleIds.OrgAdmin)) {
                    admins += 1;
                    if (admins > 1) {
                        return false;
                    }
                }
            }
            return true;
        };
        const hasOnlyOneAdmin = checkForOneAdmin();
        if (
            currentUser?.isOrgUser &&
            currentUser.rolesIds?.includes(OrgRoleIds.OrgAdmin) &&
            hasOnlyOneAdmin
        ) {
            return false;
        }
        return true;
    });

    getGroupId(row: UserRecord): string {
        return row.isOrgUser ? this.currentOrg$$().id : row.groupRoles[0].groupId;
    }

    updateRole(row: UserRecord, roleId: string): void {
        const folder = this.getGroupId(row);
        this.orgUsersStore.updateUser(
            this.currentOrg$$().id,
            row.isOrgUser ? '' : folder,
            row.email,
            roleId,
        );
    }

    getRowRoleId(user: UserRecord): string {
        return user.rolesIds?.[0] ?? '';
    }

    protected getDisplayRole(user: UserRecord): string {
        return this.hasMultipleRoles(user)
            ? this.translateService.instant('Multiple')
            : this.permissionName(this.getRowRoleId(user));
    }

    newUserDialog = (): void => {
        const organization = this.currentOrg$$()!;
        this.dialogService.addOrgUserV2({
            organization,
            email: this.email$$(),
            initialFolder: this.routerState.state$$().groupId || organization.id,
        });
    };

    private getFolderName(accessId: string | undefined): string {
        if (!accessId) {
            return '';
        }
        const path = this.groupsStore.groupPathMap$$()?.[accessId]?.path ?? [];
        if (!path.length) {
            return '';
        }
        return path[path.length - 1]?.name ?? '';
    }

    deleteUser(row: UserRecord): void {
        let message: string;
        switch (row.groupRoles?.length) {
            case 0:
                message = this.translateService.instant(
                    this.LANG.channelPartners.usersTable.deleteDialog.singleOrgMessage,
                    {
                        name: row.email,
                        organization: escape(this.currentOrg$$()?.name),
                    },
                );
                break;
            case 1:
                message = this.translateService.instant(
                    this.LANG.channelPartners.usersTable.deleteDialog.singleFolderMessage,
                    {
                        name: row.email,
                        folder: escape(row.groupRoles[0].name ?? this.getFolderName(row.accessId)),
                    },
                );
                break;
            default:
                message = this.translateService.instant(
                    this.LANG.channelPartners.usersTable.deleteDialog.multipleFoldersMessage,
                    {
                        name: row.email,
                        count: row.groupRoles?.length,
                    },
                );
        }
        const groupId = row.groupRoles[0]?.groupId || this.currentOrg$$().id;

        this.dialogService
            .confirm({
                message,
                title: this.LANG.channelPartners.usersTable.deleteDialog.deleteAccess,
                footer: {
                    actionLabel:
                        this.LANG.channelPartners.usersTable.deleteDialog.footer.actionLabel,
                    cancelLabel:
                        this.LANG.channelPartners.usersTable.deleteDialog.footer.cancelLabel,
                    buttonClass: 'btn-danger',
                },
            })
            .then(async confirm => {
                if (confirm) {
                    return this.orgUsersStore.removeUser(this.currentOrg$$()!.id, row.email, [
                        groupId,
                    ]);
                }
            });
    }

    addAccess = (): void => {
        const currentGroupId = this.routerState.state$$().groupId;
        const organization = this.currentOrg$$()!;
        this.dialogService.addOrgUserV2({
            organization,
            email: this.email$$(),
            initialFolder: currentGroupId || organization.id,
        });
    };

    bulkDeleteUsers(): void {
        this.dialogService
            .confirm({
                message: this.translateService.instant(
                    this.LANG.channelPartners.usersTable.deleteDialog.multipleFoldersMessage,
                    {
                        name: this.email$$(),
                        count: this.selectedCount$$(),
                    },
                ),
                title: this.LANG.channelPartners.usersTable.deleteDialog.deleteAccess,
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
                    const groupIds = this.selectedGroups$$()?.map((group: UserRecord): string =>
                        this.getGroupId(group),
                    );
                    this.orgUsersStore.removeUser(
                        this.currentOrg$$()!.id,
                        this.email$$(),
                        groupIds,
                    );

                    if (this.accessTableRecords$$().length === this.selectedCount$$()) {
                        this.router
                            .navigate(['users'], { relativeTo: this.activatedRoute })
                            .catch(error => {
                                console.error(error);
                            });
                    }
                }
            });
    }
}
