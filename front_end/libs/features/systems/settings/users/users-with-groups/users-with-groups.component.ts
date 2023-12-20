import { Component, computed, signal } from '@angular/core';
import { UntilDestroy } from '@ngneat/until-destroy';
import { debounceTime } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import {
    DATA_TYPE,
    MultiSelectItem,
} from '@components/dropdowns/multi-select/multi-select.component.types';
import { NxUser, UserPermissionDescription } from '@services/system-user.types';
import { UserWithGroupsManager } from '@services/system.service/user-manager/user-with-groups-manager';
import { alphabeticalSort } from '@utils/general';
import { NxFormBuilder, NxFormGroup } from '@utils/reactive-form-builder';

import { NxSystemUsersBaseComponent } from '../edit-user-base/edit-user-base.component';
import { type UserGroupFormControls } from '../user-form.types';

@UntilDestroy({ checkProperties: true })
@Component({
    selector: 'nx-system-user-with-groups-component',
    templateUrl: 'users-with-groups.component.html',
    styleUrls: ['users-with-groups.component.scss'],
})
export class NxSystemUsersWithGroupsComponent extends NxSystemUsersBaseComponent {
    roles: string[];
    selectedGroups: string[];
    selectedGroupsList: { name: string; description: string; custom?: boolean }[];
    user$$ = signal<NxUser>({} as NxUser);
    filteredGroups$$ = computed<MultiSelectItem[]>(() => {
        const groups = this.system.userManager.groups$$() || [];
        const isLdap = this.isLdap$$();
        // Use user$$ to trigger groups update on user change as LDAP to LDAP change will not trigger groups$$
        this.user$$();

        const userManager = this.system.userManager as UserWithGroupsManager;
        const isOwner = this.system.permissionManager.isOwner$$();

        return this.processLdapGroups(
            [...groups.filter(group => isOwner || !userManager.isGroupPowerUser(group))],
            isLdap,
        );
    });
    accountBlockFooterSettings$$ = computed(() => ({
        cloudAccountSettings: !this.environment.isLocal && this.isCloud$$() && this.isMe$$(),
        changePassword: this.editPermissions$$().changePassword,
        delete: this.editPermissions$$().delete,
    }));
    isAccountBlockFooterVisible$$ = computed(() =>
        Object.values(this.accountBlockFooterSettings$$()).some(Boolean),
    );

    userGroupForm: NxFormGroup<UserGroupFormControls>;

    resetForm = (): void => {
        if (this.userGroupForm) {
            this.userGroupForm.reset();
        }
    };

    protected changeUser(user: NxUser): void {
        this.removeOldForm$.next(true);
        if (this.userGroupForm) {
            this.userForm.emit(undefined);
        }

        this.selectedGroups = user.groupIds || [];
        const isLocalOwner = !this.isCloud$$() && user.isOwner;
        this.processSelectedGroupsList(this.selectedGroups, isLocalOwner);

        // setTimeout is required for handling items. Without it the defaultLdap group is missing.
        setTimeout(() => {
            this.userGroupForm = NxFormBuilder<UserGroupFormControls>({
                email: {
                    value: user.email,
                    disabled: !this.editPermissions$$().changeInfo || this.isLdap$$(),
                },
                fullName: {
                    value: user.fullName,
                    disabled: !this.editPermissions$$().changeInfo || this.isLdap$$(),
                },
                groupIds: {
                    value: [...this.selectedGroups],
                    disabled: !this.editPermissions$$().changePermissions,
                },
                isEnabled: {
                    value: user.isEnabled,
                    disabled: !this.editPermissions$$().enable,
                },
            });
            this.userGroupForm.valueChanges
                .pipe(debounceTime(100), takeUntil(this.removeOldForm$))
                .subscribe(values => {
                    if (this.editPermissions$$().changePermissions) {
                        this.processSelectedGroupsList(values.groupIds);
                    }
                });
            this.userForm.emit(this.userGroupForm);
            this.user$$.set(user);
        });
    }

    protected initProcesses(): void {
        // DO not attempt to set the process correctly!!! Due to issues with multiple for watchers it's best to leave this alone for now.
        this.editUser = this.processService.createProcess(
            async () => {
                await this.checkIfEditable(this.userGroupForm);
                const user = Object.assign(
                    this.formatUser(this.selectedUser),
                    this.userGroupForm.getRawValue(),
                );
                this.locked.add(user.email);
                try {
                    await (this.system.userManager as UserWithGroupsManager).modifyUser(user);
                    return this.system.getUsers(true);
                } catch (err) {
                    return Promise.reject(err);
                } finally {
                    this.locked.delete(user.email);
                }
            },
            {
                ignoreError: true,
            },
            () => {
                this.userGroupForm.freeze();
                this.selectedGroups = [...this.userGroupForm.controls.groupIds.value];
            },
            () => {
                this.showUserChangeFailedToast();
            },
        );
    }

    private processSelectedGroupsList(newList: string[], localOwner = false): void {
        const builtInGroup: UserPermissionDescription[] = [];
        const customGroup: UserPermissionDescription[] = [];
        const ldapGroup: UserPermissionDescription[] = [];
        let ldapDefault: UserPermissionDescription | undefined;
        const userGroups = (this.system.userManager as UserWithGroupsManager).userGroups;

        if (userGroups) {
            Object.values(userGroups).forEach(({ id, name, description, attributes, type }) => {
                if (!newList.includes(id)) {
                    return;
                }

                if (attributes === 'readonly') {
                    builtInGroup.push({
                        name,
                        description,
                    });
                } else if (type === 'ldap') {
                    if (id === '{00000000-0000-0000-0000-100100000000}') {
                        ldapDefault = { name, description };
                    } else {
                        ldapGroup.push({
                            name,
                            description,
                        });
                    }
                } else {
                    customGroup.push({
                        name,
                        description,
                        custom: true,
                    });
                }
            }, []);
        }

        // Each Permission option needs to be in alphabetical order in their respective category, builtInGroup is an exception
        customGroup.sort(alphabeticalSort(groups => groups.name));
        ldapGroup.sort(alphabeticalSort(groups => groups.name));
        if (ldapDefault) {
            ldapGroup.unshift(ldapDefault);
        }
        this.selectedGroupsList = builtInGroup.concat(customGroup, ldapGroup);
    }

    private processLdapGroups(groups: MultiSelectItem[], isLdap: boolean): MultiSelectItem[] {
        const { ldapUserGroupText } = this.LANG.dialogs.titles;
        const ldapIndex = groups.findIndex(({ label }) => label === ldapUserGroupText);
        if (ldapIndex !== -1) {
            const defaultGroups = groups.slice(0, ldapIndex - 1);
            if (isLdap) {
                const ldapGroups = groups
                    .slice(ldapIndex - 1)
                    .filter(
                        ({ id }) =>
                            ['title', 'horizontal'].includes(id) ||
                            this.selectedGroups.includes(id),
                    )
                    .map(group => ({
                        ...group,
                        disabled: !['title', 'horizontal'].includes(group.id),
                    }));

                if (ldapGroups.length > 2) {
                    defaultGroups.push(...ldapGroups);
                }
            }
            groups = defaultGroups;
        }
        return groups;
    }

    protected readonly DATA_TYPE = DATA_TYPE;
}
