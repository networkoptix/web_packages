import {
    Component, ViewChild
} from '@angular/core';
import { NgForm } from '@angular/forms';
import { UntilDestroy } from '@ngneat/until-destroy';

import { servers } from '@lib/variables/static-variables';
import { Translatable } from '@pipes/any-translate.types';
import type { NxSystemUser } from '@services/system.service/user-manager/user-manager-types';

import { NxSystemUsersBaseComponent } from '../edit-user-base/edit-user-base.component';

/**
 * POTENTIAL FUTURE TASKS TO GET DONE
 * get remove user working
 * get add user working (use separate api endpoint from modifyUser)
 * check other places that might use the user object (search for this.system.users and userManager.users)
 * try to bring more logic into user-with-groups-manager
 */

@UntilDestroy({ checkProperties: true })
@Component({
    selector: 'nx-system-user-with-groups-component',
    templateUrl: 'users-with-groups.component.html',
    styleUrls: ['users-with-groups.component.scss']
})

export class NxSystemUsersWithGroupsComponent extends NxSystemUsersBaseComponent {
    roles: string[];
    selectedGroups: string[];
    selectedGroupsList: { name: Translatable, description: Translatable }[];

    processedGroups: { id: string, label: Translatable, tooltip?: string }[];

    @ViewChild('userGroupsForm', { read: NgForm }) private userGroupsForm: NgForm;

    protected initProcesses(): void {
        // DO not attempt to set the process correctly!!! Due to issues with multiple for watchers it's best to leave this alone for now.
        this.editUser = this.processService.createProcess(async () => {
            await this.checkIfEditable();
            const user = this.formatUser(this.selectedUser);
            this.locked.add(user.email);
            try {
                user.userGroupIds = this.selectedGroups;
                await this.system.userManager.modifyUser(user);
                await this.system.getUsers(true).catch(err => console.error(err));
            } catch (err) {
                if (err?.error?.errorId === servers.errors.oldSessionErrorId) {
                    const ready = await this.simpleDialogService.refreshSession(this.system);
                    if (ready) {
                        await this.system.userManager.modifyUser(user);
                        await this.system.getUsers(true);
                    }
                } else {
                    this.showUserChangedToast();
                }
            } finally {
                this.locked.delete(user.email);
                this.setUser();
            }
        }, {
            ignoreError: true
        },
        undefined,
        () => {} // Added to suppress the default logging in processes
        );
    }

    protected setUser(): Promise<boolean | void> | void {
        if (this.system?.userManager?.users?.length) {
            this.processGroups();

            this.locked.clear();

            let user: NxSystemUser;
            if (this.paramUser) {
                user = this.findUser();
            }
            if (!user) {
                return this.routeToFirstUser();
            }

            this.setUserHelper(user);

            // deals with the lack of userGroupIds for cloud Owner
            if (this.selectedUser.isOwner && this.selectedUser.type === 'cloud') {
                this.selectedGroupsList = [
                    {
                        name: this.LANG.accessRoles.Owner.label,
                        description: this.LANG.accessRoles.Owner.description
                    }
                ];
            } else {
                this.selectedGroups = this.selectedUser.userGroupIds;
                const isLocalOwner = !this.selectedUser.isCloud && this.selectedUser.isOwner;
                this.processSelectedGroupsList(this.selectedGroups, isLocalOwner);
            }

            this.applyService.resetFormWatchers();
            setTimeout(() => {
                this.applyService.createFormWatcher(
                    'userEnabledForm',
                    this.userEnabledForm,
                    this.editUser
                );

                if (this.selectedUser.canBeEdited) {
                    this.applyService.createFormWatcher(
                        'userGroupsForm',
                        this.userGroupsForm,
                        this.editUser
                    );
                }

                if (!this.selectedUser.isCloud) {
                    this.applyService.createFormWatcher(
                        'userSettingsForm',
                        this.userSettingsForm,
                        this.editUser
                    );
                }
            });
        }
    }

    private processGroups(): void {
        const { defaultUserGroupText, customUserGroupText } = this.LANG.dialogs.titles;
        this.processedGroups = [{ id: 'title', label: defaultUserGroupText }];
        let customTitleNeeded = false;
        this.system.userManager.userGroups.forEach(({ id, name, description, isPredefined }) => {
            if (name !== 'Owner') {
                if (!customTitleNeeded && !isPredefined) {
                    customTitleNeeded = true;
                    this.processedGroups.push(
                        { id: 'horizontal', label: 'horizontal' },
                        { id: 'title', label: customUserGroupText }
                    );
                }
                this.processedGroups.push({ id, label: name, tooltip: description });
            }
        });
    }

    toggleGroup(newList: string[]): void {
        this.selectedGroups = [...newList];
        this.processSelectedGroupsList(this.selectedGroups);
    }

    private processSelectedGroupsList(newList: string[], localOwner = false): void {
        this.selectedGroupsList = [];
        this.system.userManager.userGroups.forEach(({ id, name, description }) => {
            if (newList.includes(id)) {
                if (localOwner) {
                    description = this.LANG.accessRoles.Administrator.description;
                }
                this.selectedGroupsList.push({ name, description });
            }
        });
    }
}
