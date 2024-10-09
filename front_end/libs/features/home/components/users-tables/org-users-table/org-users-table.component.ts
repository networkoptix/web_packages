import { Component, computed, Output } from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import { escape } from 'lodash-es';
import { NgxTranslateCutModule } from 'ngx-translate-cut';

import * as cpActions from '@common/store/channel-partners/channel-partners.actions';
import { NxCheckAllContainerDirective } from '@components/checkbox/checkbox-check-all-container.directive';
import { NxCheckAllDirective } from '@components/checkbox/checkbox-check-all.directive';
import { NxSearchHighlightComponent } from '@components/search-highlight/search-highlight.component';
import { NxSelectV2Module } from '@components/select-v2/select-v2.module';
import { DIALOG_SIZE } from '@dialogs/dialog-config-v2';
import { NxTooltipV2Directive } from '@directives/tooltip-v2/tooltip-v2.directive';
import { UserRecord } from '@pages/home/components/users/channel-partner-users/channel-partner-users.types';
import { HEADER_ITEM } from '@pages/home/home.types';
import { OrgRoleIds } from '@services/nx-cloud-api/cloud-services/channel-partners/channel-partners-api.types';
import { selectCurrentOrganization } from '@store/channel-partners/channel-partners.selectors';

import { StranglerImports } from '../abstract-user-table/abstract-user-table-imports';
import { AbstractUserTableDirective } from '../abstract-user-table/abstract-user-table.directive';

@Component({
    selector: 'nx-org-users-table',
    templateUrl: './org-users-table.component.html',
    styleUrls: ['../abstract-user-table/abstract-user-table.component.scss'],
    standalone: true,
    imports: [
        StranglerImports,
        NxCheckAllContainerDirective,
        NxCheckAllDirective,
        NxSelectV2Module,
        NxSearchHighlightComponent,
        NxTooltipV2Directive,
        NgxTranslateCutModule,
    ],
})
export class NxOrgUsersTableComponent extends AbstractUserTableDirective {
    protected headers: HEADER_ITEM[] = [
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
        { name: 'accessLevel', value: this.LANG.channelPartners.usersTableHeaders.accessLevel },
        { name: 'groups', value: this.LANG.channelPartners.usersTableHeaders.groups },
    ];
    setArrange = ['userId', 'email', 'fullName', 'accessLevel', 'roles', 'delete', 'expand'];
    idPropName = 'userId';

    roles$$ = this.cpService.organizationRoles$$;
    orgUserRecords$$ = this.orgUsersStore.currentGroupUsersEntities;
    filteredRecords$$ = this.orgUsersStore.filteredRecords$$;
    currentOrg$$ = this.store.selectSignal(selectCurrentOrganization);
    searching$$ = computed(
        () =>
            !!this.orgUsersStore.searchQuery() ||
            Object.keys(this.orgUsersStore.searchFilters()).length,
    );
    searchingQuery$$ = computed(() => this.orgUsersStore.searchQuery());

    currentGroupId$$ = computed(() => this.groupsStore.currentGroupId$$()?.id);
    inGroup$$ = computed(() => this.currentGroupId$$() !== this.currentOrg$$().id);
    canManageUsers$$ = computed(() => this.permissionStore.canViewOrgUsers$$());
    hasOnlyOneAdmin$$ = computed(() => {
        const users = this.orgUserRecords$$();
        let foundAdmin = false;
        for (const user of users) {
            if (user.rolesIds?.includes(OrgRoleIds.OrgAdmin)) {
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
        return this.orgUserRecords$$()?.find(user => user.rolesIds?.includes(OrgRoleIds.OrgAdmin))
            ?.email;
    });

    adminUsers$$ = computed(() => {
        return this.orgUserRecords$$()?.filter(user =>
            user.rolesIds?.includes(OrgRoleIds.OrgAdmin),
        );
    });

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

    currAccessLevel = this.currentOrg$$()?.channelPartnerAccessLevel;

    getRowRoleId(user: UserRecord): string {
        return user?.rolesIds?.[0] ?? user?.groupRoles?.[0]?.rolesIds?.[0] ?? '';
    }

    getDisplayRole(user: UserRecord): string {
        return this.hasMultipleRoles(user)
            ? this.translateService.instant('Multiple')
            : this.permissionName(this.getRowRoleId(user));
    }

    canDeleteUser(user: UserRecord): boolean {
        const userIsOnlyAdmin =
            this.hasOnlyOneAdmin$$() &&
            this.onlyAdmin$$() === user.email &&
            this.currAccessLevel !== OrgRoleIds.OrgAdmin;
        return (
            user.accessLevel?.id === this.currentGroupId$$() ||
            (!this.inGroup$$() && !userIsOnlyAdmin)
        );
    }

    canUpdateUserRole(user: UserRecord): boolean {
        if (!this.canManageUsers$$()) {
            return false;
        }
        const currentGroupId = this.currentGroupId$$();
        const orgId = this.currentOrg$$()?.id;
        const userIsOnlyAdmin = this.hasOnlyOneAdmin$$() && this.onlyAdmin$$() === user.email;
        return (
            (user.isOrgUser &&
                (!userIsOnlyAdmin || this.currAccessLevel === OrgRoleIds.OrgAdmin) &&
                currentGroupId === orgId) ||
            (!user.isOrgUser &&
                !this.hasMultipleRoles(user) &&
                (user.accessLevel?.id === currentGroupId || currentGroupId === orgId))
        );
    }

    updateRole(user: UserRecord, roleId: string): void {
        const folder = user?.groupRoles?.[0]?.groupId || user.accessLevel?.id || '';
        this.orgUsersStore.updateUser(this.currentOrg$$().id, folder, user.email, roleId);
    }

    newUserDialog = (): void => {
        const organization = this.currentOrg$$()!;
        this.dialogService.addOrgUserV2({
            organization,
            initialFolder: this.routerState.state$$().groupId || organization.id,
        });
    };

    deleteUser(user: UserRecord): void {
        let message: string;
        if (user.isOrgUser) {
            message = this.translateService.instant(
                this.LANG.channelPartners.usersTable.deleteDialog.singleOrgMessage,
                {
                    name: user.email,
                    organization: this.currentOrg$$().name,
                },
            );
        } else if (user.groupRoles?.length > 1) {
            message = this.translateService.instant(
                this.LANG.channelPartners.usersTable.deleteDialog.multipleFoldersMessage,
                {
                    name: user.email,
                    count: user.groupRoles?.length,
                },
            );
        } else {
            message = this.translateService.instant(
                this.LANG.channelPartners.usersTable.deleteDialog.singleFolderMessage,
                {
                    name: user.email,
                    folder: escape(user.accessLevel?.name || user.groupRoles[0]?.name),
                },
            );
        }
        this.dialogService
            .confirm(
                {
                    message,
                    title: this.LANG.channelPartners.usersTable.deleteDialog.deleteAccess,
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
        const selectedOrgUsersMap = this.selectedOrgUsersMap$$();
        if (this.adminUsers$$().every(({ email }) => selectedOrgUsersMap.has(email))) {
            this.store.dispatch(
                cpActions.showBannerAction({
                    banner: {
                        message: this.LANG.channelPartners.orgs.adminWarning,
                        icon: 'error.svg',
                        type: 'error',
                        page: 'organization',
                    },
                }),
            );
            return;
        }

        if (this.selectedOrgUsers$$().length === 1) {
            const user = this.selectedOrgUsers$$()[0] as UserRecord;
            this.deleteUser(user);
            return;
        }

        this.dialogService
            .confirm(
                {
                    message: this.translateService.instant(
                        this.LANG.channelPartners.usersTable.deleteDialog.multipleMessage,
                        {
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
                },
                { width: DIALOG_SIZE.MICRO_SMALL },
            )
            .then((confirm: boolean) => {
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
