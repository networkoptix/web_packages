import { Component, ViewChild, signal } from '@angular/core';
import { NgForm } from '@angular/forms';
import { UntilDestroy } from '@ngneat/until-destroy';

import { NxUser } from '@services/system-user.types';
import { UserWithGroupsManager } from '@services/system.service/user-manager/user-with-groups-manager';

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
    styleUrls: ['users-with-groups.component.scss'],
})
export class NxSystemUsersWithGroupsComponent extends NxSystemUsersBaseComponent {
    roles: string[];
    selectedGroups: string[];
    selectedGroupsList: { name: string; description: string }[];

    temporaryUser = signal<boolean>(false);

    @ViewChild('userGroupsForm', { read: NgForm }) private userGroupsForm: NgForm;
    protected changeUser(user: NxUser): void {
        this.selectedGroups = user.groupIds;
        const isLocalOwner = !this.isCloud() && user.isOwner;
        this.processSelectedGroupsList(this.selectedGroups, isLocalOwner);
        this.temporaryUser.set(this.selectedUser.type === this.UserType.temporaryLocal);

        this.applyService.resetFormWatchers();
        setTimeout(() => {
            this.applyService.createFormWatcher(
                'userEnabledForm',
                this.userEnabledForm,
                this.editUser,
            );

            if (user.canBeEdited && !this.temporaryUser()) {
                this.applyService.createFormWatcher(
                    'userGroupsForm',
                    this.userGroupsForm,
                    this.editUser,
                );
            }

            if (!this.isCloud()) {
                this.applyService.createFormWatcher(
                    'userSettingsForm',
                    this.userSettingsForm,
                    this.editUser,
                );
            }
        });
    }

    protected initProcesses(): void {
        // DO not attempt to set the process correctly!!! Due to issues with multiple for watchers it's best to leave this alone for now.
        this.editUser = this.processService.createProcess(
            async () => {
                await this.checkIfEditable();
                const user = this.formatUser(this.selectedUser);
                this.locked.add(user.email);
                try {
                    user.groupIds = this.selectedGroups;
                    await (this.system.userManager as UserWithGroupsManager).modifyUser(user);
                    await this.system.getUsers(true).catch(err => console.error(err));
                } catch (err) {
                    this.showUserChangeFailedToast();
                } finally {
                    this.locked.delete(user.email);
                }
            },
            {
                ignoreError: true,
            },
            undefined,
            () => {}, // Added to suppress the default logging in processes
        );
    }

    toggleGroup(newList: string[]): void {
        this.selectedGroups = [...newList];
        this.processSelectedGroupsList(this.selectedGroups);
    }

    private processSelectedGroupsList(newList: string[], localOwner = false): void {
        this.selectedGroupsList = (
            (this.system.userManager as UserWithGroupsManager)?.userGroups || []
        ).reduce((groups, { id, name, description }) => {
            if (newList.includes(id)) {
                groups.push({ name, description });
            }
            return groups;
        }, []);
    }
}
