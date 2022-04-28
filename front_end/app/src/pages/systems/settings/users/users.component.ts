import { Location } from '@angular/common';
import {
    Component,
    OnInit,
    ViewChild,
    ViewContainerRef,
} from '@angular/core';
import { NgForm } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { UntilDestroy } from '@ngneat/until-destroy';
import { Subscription } from 'rxjs';
import { filter } from 'rxjs/operators';

import { LanguageI18NStaticTypes } from '@app/language_i18n_static_types';
import { NxDialogsService } from '@dialogs/dialogs.service';
import { NxToastService } from '@dialogs/toast.service';
import { environment } from '@environments/environment';
import { FormWatcher, NxApplyService } from '@services/apply.service';
import { NxConfigService, IConfig } from '@services/nx-config';
import { NxLanguageProviderService } from '@services/nx-language-provider';
import { NxPageService } from '@services/page.service';
import { NxProcessService, Process } from '@services/process.service';
import { NxSystem, NxSystemRole, NxSystemUser } from '@services/system.service';
import { NxUriService } from '@services/uri.service';
import { NxUtilsService } from '@services/utils.service';
import { NxMenuService } from '@src/menu';

import { NxSettingsService } from '../settings.service';

@UntilDestroy({ checkProperties: true })
@Component({
    selector: 'nx-system-user-component',
    templateUrl: 'users.component.html',
    styleUrls: ['users.component.scss']
})

export class NxSystemUsersComponent implements OnInit {
    CONFIG: IConfig;
    readonly environment = environment;
    LANG: LanguageI18NStaticTypes;
    location;
    paramUser;
    accessDescription: string;
    editUser: Process;
    locked;
    nextUserId: string;
    selectedUser: NxSystemUser;
    systemAvailable: boolean;
    system: NxSystem;
    deleteMessage: string;
    currentCustomRole: any;
    localUserName: string;
    fullName: string;
    email: string;
    editMode = false;
    emptyName = false;
    username: string;
    role: string;

    passwordChanged: boolean = false
    userEnabledFormWatcher: FormWatcher;
    userRoleFormWatcher: FormWatcher;
    userSettingsFormWatcher: FormWatcher;

    @ViewChild('pageApply', { read: ViewContainerRef, static: true }) pageApply: ViewContainerRef;
    @ViewChild('userEnabledForm', { read: NgForm }) userEnabledForm: NgForm;
    @ViewChild('userRoleForm', { read: NgForm }) userRoleForm: NgForm;
    @ViewChild('userSettingsForm', { read: NgForm }) userSettingsForm: NgForm;

    get localUserNameDiffers (): boolean {
        return this.localUserName !== this.username;
    }

    get shouldChangePassword (): boolean {
        return this.localUserNameDiffers && !this.passwordChanged;
    }

    private routeParamsSubscription: Subscription;
    private systemSubscription: Subscription;
    private userSubscription: Subscription;

    private setupDefaults () {
        this.locked = {};
        this.menuService.section = 'users';
    }

    constructor (
        configService: NxConfigService,
        languageService: NxLanguageProviderService,
        location: Location,
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
        this.location = location;
        this.CONFIG = configService.getConfig();
        this.LANG = languageService.translations;

        this.setupDefaults();
    }

    private _filterUser =
        (user: any) => NxUtilsService.cleanId(user.id) === this.paramUser;

    private _findUser () {
        return this.system.userManager.users.find(this._filterUser);
    }

    public ngOnInit (): void {
        this.applyService.initPageFormsWatcher(this.pageApply);

        this.routeParamsSubscription = this.route
            .params
            .subscribe(params => {
                if (params.userId) {
                    this.paramUser = params.userId;
                    const qmi = this.paramUser.indexOf('?'); // qmi stands for "question mark index"
                    if (qmi > -1) {
                        this.paramUser = this.paramUser.substring(0, qmi);
                    }
                    this.menuService.detail = this.paramUser;
                    this.setUser();
                }
            });

        this.systemSubscription = this.settingsService.systemSubject
            .pipe(filter(data => data !== undefined))
            .subscribe((system) => {
                this.system = system;
                if (!this.environment.isLocal) {
                    this.pageService.pageTitle = this.system.info.name;
                }
                // Route guard did not work :( ... so doing it the old way
                if (!this.system.userManager.permissions?.editUsers) {
                    this.uriService
                        .navigateSystem(
                            `${this.CONFIG.menus.systemSettings.baseUrl}SYSTEM_ID`,
                            this.system
                        )
                        .catch(error => {
                            console.error(error);
                        });

                    return;
                }
                if (this.userSubscription) {
                    this.userSubscription.unsubscribe();
                }
                this.userSubscription = this.system.infoSubject.subscribe(() => {
                    this.systemAvailable = this.system.isAvailable &&
                        this.system.mergeInfo === undefined;

                    const updatedUser = this._findUser();

                    const cleanUser =  { ...this.selectedUser };
                    delete cleanUser.role?.optionLabel;

                    if (
                        !this.applyService.locked && (
                            this.paramUser === undefined ||
                            this.paramUser !== NxUtilsService.cleanId(
                                this.selectedUser?.id
                            ) ||
                            !NxUtilsService.isEqual(updatedUser, cleanUser)
                        )
                    ) {
                        this.setUser();
                    }
                });
            });

        this.initProcesses();
    }

    private initProcesses () {
        this.editUser = this.processService.createProcess(async () => {
            if (this.shouldChangePassword) {
                // console.log('rejected saving the form until password has changed')
                return Promise.reject();
            }
            if (this.userSettingsForm?.invalid) {
                return Promise.reject();
            }
            const user = this.selectedUser;
            if (!user.name || this.locked[user.email]) {
                return Promise.reject();
            }

            try {
                this.locked[user.email] = true;
                user.name = this.localUserName;
                user.email = this.email;
                user.fullName = this.fullName;
                await this.system.saveUser(user, user.role);
                await this.system.getUsers(true).catch(err => console.error(err));
            } catch (_) {
                const options = {
                    classname: this.CONFIG.toast.warning,
                    autohide: true,
                    delay: this.CONFIG.alertTimeout
                };
                this.toastService.show(
                    NxLanguageProviderService.translate(
                        this.LANG.toastMessage.userChangesFail
                    ), options);
            } finally {
                this.locked[user.email] = false;
                this.setUser();
            }
        }, {
            ignoreError: true
        });
    }

    public removeUser () {
        const user = this.selectedUser;
        if (this.locked[user.email]) {
            return;
        }
        this.locked[user.email] = true;
        this._calcNextUserId();

        this.dialogs.removeUser(this.system, user).then((result) => {
            if (result) {
                delete this.locked[user.email];
                this.paramUser = this.nextUserId;

                this.uriService
                    .navigateSystem(
                        `${this.CONFIG.menus.systemSettings.baseUrl}SYSTEM_ID/users/${this.nextUserId}`,
                        this.system
                    ).catch(error => {
                        console.error(error);
                    });

                this.menuService.detail = this.nextUserId;
            } else {
                this.locked[user.email] = false;
            }
        });
    }

    protected _calcNextUserId () {
        const currentUserIndex = this.system.users.findIndex((user) => {
            return user.id === this.selectedUser.id;
        });
        const incIndex = currentUserIndex + 1;
        const decIndex = currentUserIndex - 1;
        const nextIndex =
            (incIndex !== this.system.users?.length)
                ? incIndex
                : decIndex; // single-user list case check required here, too?
        this.nextUserId = this.system.mediaserver.cleanId(
            this.system.users[nextIndex].id
        );
    }

    private setUser () {
        if (this.system && this.system.users?.length > 0) {
            let user;
            if (this.paramUser) {
                user = this.system.users.find(this._filterUser); // maybe use this.findUser() instead?
            }
            if (typeof (user) === 'undefined') {
                user = this.system.users[0];
                const userId = this.system.mediaserver.cleanId(user.id);

                this.uriService
                    .navigateSystem(
                        `${this.CONFIG.menus.systemSettings.baseUrl}SYSTEM_ID/users/${userId}`,
                        this.system
                    ).catch(error => {
                        console.error(error);
                    });
                return;
            }

            this.applyService.resetFormWatchers();

            this.passwordChanged = false;

            this.selectedUser = { ...user };
            delete this.selectedUser.role?.optionLabel; // clean any leftovers
            this.localUserName = this.selectedUser.name;

            this.deleteMessage = this.selectedUser.isCloud
                ? this.LANG.system.users.cloudDelete()
                : this.LANG.system.users.localDelete();

            this.menuService.detail = NxUtilsService.cleanId(
                this.selectedUser.id
            );
            if (this.selectedUser.role.name === 'Custom') {
                this.currentCustomRole = NxUtilsService.deepCopy(
                    this.selectedUser.role
                );
            }

            this.setPermission(this.selectedUser.role);
            this.fullName = this.selectedUser.fullName;
            this.email = this.selectedUser.email;
            this.username = user.isCloud ? user.email : user.name;
            this.role = !user.isCloud && user.name === 'admin'
                ? 'Owner'
                : user.role.name;

            this.settingsService.footer = true;

            setTimeout(() => {
                this.userEnabledFormWatcher = this.applyService
                    .createFormWatcher(
                        'userEnabledForm',
                        this.userEnabledForm,
                        this.editUser
                    );

                if (this.selectedUser.canBeEdited) {
                    this.userRoleFormWatcher = this.applyService
                        .createFormWatcher(
                            'userRoleForm',
                            this.userRoleForm,
                            this.editUser
                        );
                }

                if (!this.selectedUser.isCloud) {
                    this.userSettingsFormWatcher = this.applyService
                        .createFormWatcher(
                            'userSettingsForm',
                            this.userSettingsForm,
                            this.editUser
                        );
                }
            });
        }
    }

    public changePassword () {
        const dialog = this.dialogs
            .changePassword(this.system, this.selectedUser);
        dialog.then(this._onPasswordChanged);
    }

    private _onPasswordChanged = (result) => {
        if (!result) {
            // console.log('password change cancelled')
            return;
        }
        // console.log('password changed')
        this.passwordChanged = true;
    }

    public setPermission (role: NxSystemRole) {
        const userRole = role?.name ?? this.selectedUser.accessRole;
        this.accessDescription = this.LANG.accessRoles[userRole]
            ? this.LANG.accessRoles[userRole].description()
            : this.LANG.accessRoles.customRole.description();
        this.selectedUser.role = { ...role };
        this.role = role.name;
    }

    public routeToAccountSettings () {
        this.uriService
            .updateURI('/account')
            .catch(error => {
                console.error(error);
            });
    }
}
