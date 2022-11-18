import {
    Component,
    OnDestroy,
    OnInit,
    ViewChild,
    ViewContainerRef,
} from '@angular/core';
import { NgForm } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { isEqual } from 'lodash-es';
import { filter } from 'rxjs/operators';

import { NxMenuService } from '@app/menu/menu.service';
import staticLang from '@common/language/language_i18n_static.json';
import { NxDialogsService } from '@dialogs/dialogs.service';
import { NxToastService } from '@dialogs/toast.service';
import { environment } from '@environments/environment';
import { credentialsValidation, icons, menus, toast } from '@lib/variables/static-variables';
import { Translatable } from '@pipes/any-translate.types';
import { NxApplyService } from '@services/apply.service';
import { NxPageService } from '@services/page.service';
import { NxProcessService } from '@services/process.service';
import { Process } from '@services/process.service/process';
import type { NxSystem } from '@services/system.service/system';
import type { NxSystemUser } from '@services/system.service/user-manager/user-manager-types';
import { NxUriService } from '@services/uri.service';
import { cleanId } from '@utils/general';

import { NxSettingsService } from '../../settings.service';

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

export class NxSystemUsersWithGroupsComponent implements OnInit, OnDestroy {
    readonly environment = environment;
    LANG = staticLang;

    private paramUser: string;
    private editUser: Process;
    private locked = new Set<string>();
    private localUserName: string;

    selectedUser: NxSystemUser;
    systemAvailable: boolean;
    system: NxSystem;
    deleteMessage: Translatable;
    fullName: string;
    email: string;
    username: string;
    role: string;
    roles: string[];
    selectedGroups: string[];
    selectedGroupsList: { name: Translatable, description: Translatable }[];
    credentialsValidation = credentialsValidation;
    icons = icons;
    menus = menus;
    toast = toast;

    processedGroups: { id: string, label: Translatable, tooltip?: string }[];

    private passwordChanged: boolean = false;

    @ViewChild('pageApply', { read: ViewContainerRef, static: true }) private pageApply: ViewContainerRef;
    @ViewChild('userEnabledForm', { read: NgForm }) private userEnabledForm: NgForm;
    @ViewChild('userGroupsForm', { read: NgForm }) private userGroupsForm: NgForm;
    @ViewChild('userSettingsForm', { read: NgForm }) private userSettingsForm: NgForm;

    get shouldChangePassword(): boolean {
        return this.localUserName !== this.username && !this.passwordChanged;
    }

    constructor(
        private route: ActivatedRoute,
        private applyService: NxApplyService,
        private pageService: NxPageService,
        private dialogs: NxDialogsService,
        private settingsService: NxSettingsService,
        private menuService: NxMenuService,
        private processService: NxProcessService,
        private uriService: NxUriService,
        private toastService: NxToastService
    ) {
        this.menuService.section = 'users';
    }

    private findUser(): NxSystemUser {
        return this.system.userManager.users.find(user =>
            cleanId(user.id) === this.paramUser
        );
    }

    public ngOnInit(): void {
        this.applyService.initPageFormsWatcher(this.pageApply);

        this.route.params.pipe(untilDestroyed(this)).subscribe(params => {
            if (params.userId) {
                this.paramUser = params.userId;
                const qmIndex = this.paramUser.indexOf('?');
                if (qmIndex > -1) {
                    this.paramUser = this.paramUser.substring(0, qmIndex);
                }
                this.menuService.detail = this.paramUser;
                this.setUser();
            }
        });

        this.settingsService.systemSubject
            .pipe(
                untilDestroyed(this),
                filter(data => data !== undefined),
            )
            .subscribe(system => {
                this.system = system;
                if (!this.environment.isLocal) {
                    this.pageService.pageTitle = this.system.info.name;
                }
                // Route guard did not work :( ... so doing it the old way
                if (!this.system.userManager.permissions?.editUsers) {
                    this.uriService
                        .navigateSystem(
                            `${menus.systemSettings.baseUrl}SYSTEM_ID`,
                            this.system
                        )
                        .catch(error => {
                            console.error(error);
                        });

                    return;
                }

                this.system.infoSubject
                    .pipe(untilDestroyed(this))
                    .subscribe(() => {
                        this.systemAvailable = this.system.isAvailable &&
                            this.system.mergeInfo === undefined;

                        const updatedUser = this.findUser();

                        const cleanUser = { ...this.selectedUser };
                        delete cleanUser.role?.optionLabel;

                        if (
                            !this.applyService.locked && (
                                this.paramUser === undefined ||
                                this.paramUser !== cleanId(this.selectedUser?.id) ||
                                !isEqual(updatedUser, cleanUser)
                            )
                        ) {
                            this.setUser();
                        }
                    });
            });

        this.initProcesses();
    }

    ngOnDestroy(): void {
        this.applyService.resetFormWatchers();
    }

    private initProcesses(): void {
        this.editUser = this.processService.createProcess(async () => {
            if (this.shouldChangePassword) {
                // console.log('rejected saving the form until password has changed')
                return Promise.reject();
            }
            if (this.userSettingsForm?.invalid) {
                return Promise.reject();
            }
            const user = this.selectedUser;
            if (!user.name || this.locked.has(user.email)) {
                return Promise.reject();
            }

            try {
                this.locked.add(user.email);
                user.name = this.localUserName;
                user.email = this.email;
                user.fullName = this.fullName;
                user.userGroupIds = this.selectedGroups;
                await this.system.userManager.modifyUser(user);
                await this.system.getUsers(true).catch(err => console.error(err));
            } catch (_) {
                this.toastService.notify(
                    this.LANG.toastMessage.userChangesFail,
                    toast.warning,
                );
            } finally {
                this.locked.delete(user.email);
                this.setUser();
            }
        }, {
            ignoreError: true
        });
    }

    public removeUser(): void {
        const user = this.selectedUser;
        if (this.locked.has(user.email)) {
            return;
        }
        this.locked.add(user.email);
        const nextUserId = this.calcNextUserId();

        this.dialogs.removeUser(this.system, user).then(result => {
            this.locked.delete(user.email);
            if (result) {
                this.paramUser = nextUserId;

                this.uriService
                    .navigateSystem(
                        `${menus.systemSettings.baseUrl}SYSTEM_ID/users/${nextUserId}`,
                        this.system
                    ).catch(error => {
                        console.error(error);
                    });

                this.menuService.detail = nextUserId;
            }
        });
    }

    private calcNextUserId(): string {
        const currentUserIndex = this.system.userManager.users.findIndex(user => {
            return user.id === this.selectedUser.id;
        });
        const incIndex = currentUserIndex + 1;
        const decIndex = currentUserIndex - 1;
        const nextIndex = (incIndex !== this.system.userManager.users?.length)
            ? incIndex
            : decIndex; // single-user list case check required here, too?
        return cleanId(this.system.userManager.users[nextIndex].id);
    }

    private setUser(): void {
        if (this.system?.userManager?.users?.length) {
            this.processGroups();

            this.locked.clear();

            let user: NxSystemUser;
            if (this.paramUser) {
                user = this.findUser();
            }
            if (!user) {
                user = this.system.userManager.users[0];
                const userId = cleanId(user.id);

                this.uriService
                    .navigateSystem(
                        `${menus.systemSettings.baseUrl}SYSTEM_ID/users/${userId}`,
                        this.system
                    ).catch(error => {
                        console.error(error);
                    });
                return;
            }

            this.passwordChanged = false;

            this.selectedUser = { ...user };
            delete this.selectedUser.role?.optionLabel; // clean any leftovers
            this.localUserName = this.selectedUser.name;

            this.deleteMessage = this.selectedUser.isCloud
                ? this.LANG.system.users.cloudDelete
                : this.LANG.system.users.localDelete;

            this.menuService.detail = cleanId(this.selectedUser.id);

            // this.setPermission(this.selectedUser.role);
            this.fullName = this.selectedUser.fullName;
            this.email = this.selectedUser.email;
            this.username = user.isCloud ? user.email : user.name;

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

    public changePassword(): void {
        this.dialogs
            .changePassword(this.system, this.selectedUser)
            .then(result => {
                this.passwordChanged = result;
            });
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

    public routeToAccountSettings(): void {
        this.uriService
            .updateURI('/account')
            .catch(error => {
                console.error(error);
            });
    }
}
