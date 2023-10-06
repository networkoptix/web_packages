import { Component, computed } from '@angular/core';
import { UntilDestroy } from '@ngneat/until-destroy';
import { debounceTime } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { MultiSelectItem } from '@components/dropdowns/multi-select/multi-select.component.types';
import { NxUser, UserPermissionDescription } from '@services/system-user.types';
import { UserWithGroupsManager } from '@services/system.service/user-manager/user-with-groups-manager';
import { alphabeticalSort } from '@utils/general';
import { NxFormBuilder, NxFormControl, NxFormGroup } from '@utils/reactive-form-builder';

import { NxSystemUsersBaseComponent } from '../edit-user-base/edit-user-base.component';

/**
 * POTENTIAL FUTURE TASKS TO GET DONE
 * get remove user working
 * get add user working (use separate api endpoint from modifyUser)
 * check other places that might use the user object (search for this.system.users and userManager.users)
 * try to bring more logic into user-with-groups-manager
 */
interface UserGroupFormControls {
    email: NxFormControl<string>;
    isEnabled: NxFormControl<boolean>;
    fullName: NxFormControl<string>;
    groupIds: NxFormControl<string[]>;
}

@UntilDestroy({ checkProperties: true })
@Component({
    selector: 'nx-system-user-with-groups-component',
    templateUrl: 'users-with-groups.component.html',
    styleUrls: ['users-with-groups.component.scss'],
})
export class NxSystemUsersWithGroupsComponent extends NxSystemUsersBaseComponent {
    roles: string[];
    selectedGroups: string[];
    selectedGroupsList: { name: string; description: string }[];
    filteredGroups$$ = computed<MultiSelectItem[]>(() => {
        const groups = this.system.userManager.groups$$() || [];
        const isLdap = this.isLdap$$();
        return this.processLdapGroups([...groups], isLdap);
    });

    userGroupForm: NxFormGroup<UserGroupFormControls>;

    resetForm = (): void => {
        if (this.userGroupForm) {
            this.userGroupForm.reset();
        }
    };

    protected changeUser(user: NxUser): void {
        this.removeOldForm$.next(true);
        if (this.userGroupForm) {
            this.userGroupForm = undefined;
        }

        this.selectedGroups = user.groupIds;
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
                    value: [...user.groupIds],
                    disabled: !this.editPermissions$$().changePermissions,
                },
                isEnabled: {
                    value: user.isEnabled,
                    disabled: !this.editPermissions$$().enable,
                },
            });
            this.applyServiceV2.setForm(this.userGroupForm);
            this.userGroupForm.valueChanges
                .pipe(debounceTime(100), takeUntil(this.removeOldForm$))
                .subscribe(values => {
                    if (this.editPermissions$$().changePermissions) {
                        this.processSelectedGroupsList(values.groupIds);
                    }
                });
        });
    }

    protected initProcesses(): void {
        // DO not attempt to set the process correctly!!! Due to issues with multiple for watchers it's best to leave this alone for now.
        this.editUser = this.processService.createProcess(
            async () => {
                await this.checkIfEditable();
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
        (this.system.userManager as UserWithGroupsManager).userGroups.forEach(
            ({ id, name, description, attributes, type }) => {
                if (!newList.includes(id)) {
                    return;
                }

                if (attributes === 'readonly') {
                    builtInGroup.push({
                        name,
                        description,
                    });
                } else if (type === 'ldap') {
                    ldapGroup.push({
                        name,
                        description,
                    });
                } else {
                    customGroup.push({
                        name,
                        description,
                    });
                }
            },
            [],
        );

        // Each Permission option needs to be in alphabetical order in their respective category, builtInGroup is an exception
        customGroup.sort(alphabeticalSort(this.locale, groups => groups.name));
        ldapGroup.sort(alphabeticalSort(this.locale, groups => groups.name));
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
}
