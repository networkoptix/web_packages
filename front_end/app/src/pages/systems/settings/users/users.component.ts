import {
    Component, Inject, OnDestroy,
    OnInit, ViewChild, ViewContainerRef
}                                               from '@angular/core';
import { Location }                             from '@angular/common';
import { ActivatedRoute }                       from '@angular/router';
import { UntilDestroy }                         from '@ngneat/until-destroy';
import { filter }                               from 'rxjs/operators';
import { Subscription }                         from 'rxjs';

import { NxDialogsService }                     from '@dialogs/dialogs.service';
import { NxSettingsService }                    from '../settings.service';
import { NxMenuService }                        from '@src/menu';
import { NxConfigService, IConfig }             from '@services/nx-config';
import { NxPageService }                        from '@services/page.service';
import { NxLanguageProviderService }            from '@services/nx-language-provider';
import { NxUtilsService }                       from '@services/utils.service';
import { NxSystem, NxSystemRole, NxSystemUser } from '@services/system.service';
import { NxProcessService, Process }            from '@services/process.service';
import { NxUriService }                         from '@services/uri.service';
import { NxApplyService, Watcher }              from '@services/apply.service';
import { NxToastService }                       from '@dialogs/toast.service';
import { LanguageI18NStaticTypes }              from '@app/language_i18n_static_types';
import { WINDOW }                               from '@services/window-provider';
import { environment }                          from '@environments/environment';

@UntilDestroy({ checkProperties: true })
@Component({
    selector    : 'nx-system-user-component',
    templateUrl : 'users.component.html',
    styleUrls   : ['users.component.scss']
})

export class NxSystemUsersComponent implements OnInit, OnDestroy {
    isLocal = environment.isLocal;
    CONFIG: IConfig;
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
    viewContainerRef: ViewContainerRef;
    deleteMessage: string;
    currentCustomRole: any;

    userEnabled = new Watcher<boolean>();
    userRole = new Watcher<string>();
    fullName = new Watcher<string>();
    email = new Watcher<string>();
    localUserNameWatcher = new Watcher<string>();

    editMode = false;
    emptyName = false;
    username: string;
    role: string;

    passwordChanged: boolean = false

    @ViewChild('userSettingsForm') userSettingsForm: HTMLFormElement;

    get localUserName () {
        return this.localUserNameWatcher.value;
    }

    set localUserName (value) {
        this.localUserNameWatcher.value = value;
    }

    get localUserNameDiffers (): boolean {
        return this.localUserName !== this.username
    }

    get shouldChangePassword (): boolean {
        return this.localUserNameDiffers && !this.passwordChanged
    }

    private routeParamsSubscription: Subscription;
    private systemSubscription: Subscription;
    private userSubscription: Subscription;

    private setupDefaults () {
        this.locked = {};
        this.menuService.section = 'users';
    }

    constructor (
        @Inject(WINDOW) private window: Window,
        @Inject(ViewContainerRef) viewContainerRef,
        private configService: NxConfigService,
        private route: ActivatedRoute,
        private applyService: NxApplyService,
        private language: NxLanguageProviderService,
        private pageService: NxPageService,
        private dialogs: NxDialogsService,
        private settingsService: NxSettingsService,
        private menuService: NxMenuService,
        private processService: NxProcessService,
        private uriService: NxUriService,
        private toastService: NxToastService,
        location: Location
    ) {
        this.location = location;
        this.viewContainerRef = viewContainerRef;
        this.CONFIG = configService.getConfig();

        this.setupDefaults();
    }

    protected _filterUser = (user: any) => NxUtilsService.cleanId(user.id) === this.paramUser

    protected _findUser () {
        // is `userManager` redundant here?
        // there's another piece of code differing only in its presence
        return this.system.userManager.users.find(this._filterUser);
    }

    public ngOnInit (): void {
        this.LANG = this.language.translations;

        this.routeParamsSubscription = this.route
            .params
            .subscribe(params => {
                if (params.userId) {
                    this.paramUser = params.userId;
                    const qmi = this.paramUser.indexOf('?') // qmi stands for "question mark index"
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
                if (!this.CONFIG.isLocal) {
                    this.pageService.pageTitle = this.system.info.name;
                }
                // Route guard did not work :( ... so doing it the old way
                if (!this.system.userManager.permissions?.editUsers) {
                    this.uriService
                        .navigateSystem(`${this.CONFIG.menus.systemSettings.baseUrl}SYSTEM_ID`, this.system)
                        .catch(error => {
                            console.error(error);
                        });

                    return;
                }
                if (this.userSubscription) {
                    this.userSubscription.unsubscribe();
                }
                this.userSubscription = this.system.infoSubject.subscribe(() => {
                    this.systemAvailable = this.system.isAvailable && this.system.mergeInfo === undefined;

                    const updatedUser = this._findUser()

                    const cleanUser =  { ...this.selectedUser };
                    delete cleanUser.role?.optionLabel;

                    if (!this.applyService.locked && this.paramUser === undefined ||
                        this.paramUser !== NxUtilsService.cleanId(this.selectedUser?.id) ||
                        !NxUtilsService.isEqual(updatedUser, cleanUser)) {
                        this.setUser();
                    }
                });
            });

        this.initProcesses();

        this.applyService.initPageWatcher(
            // component
            this.viewContainerRef,
            // saveProcess
            this.editUser,
            // discardFunction
            () => {
                this.selectedUser.isEnabled = this.userEnabled.originalValue;
                const originalRole = this.userRole.originalValue === 'Custom'
                    ? this.currentCustomRole : this.system.accessRoles.find(role => role.name === this.userRole.originalValue);
                this.setPermission(originalRole);
                this.localUserNameWatcher.originalValue = this.localUserNameWatcher.value = this.selectedUser.name;
                this.applyService.reset();
            },
            // dataWatchers
            [
                this.userEnabled,
                this.userRole,
                this.fullName,
                this.email,
                this.localUserNameWatcher
            ]
        );
    }

    public ngOnDestroy (): void {
        this.routeParamsSubscription.unsubscribe();
        this.systemSubscription.unsubscribe();
        if (this.userSubscription) {
            this.userSubscription.unsubscribe();
        }
    }

    public initProcesses () {
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
                user.name = this.localUserNameWatcher.value;
                await this.system.saveUser(user, user.role);
                await this.system.getUsers(true).catch(err => console.error(err));
            } catch (_) {
                this.selectedUser.name = this.localUserNameWatcher.originalValue;
                const options = {
                    classname : this.CONFIG.toast.warning,
                    autohide  : true,
                    delay     : this.CONFIG.alertTimeout
                };
                this.toastService.show(
                    NxLanguageProviderService.translate(
                        this.LANG.toastMessage.nameFail,
                        { type: this.LANG.common.login?.() }
                    ), options);
            } finally {
                this.locked[user.email] = false;
                this.applyService.reset(true);
                this.setUser();
                this.applyService.reset();
            }
        }, {
            ignoreError: true
        });
    }

    public handleUserNameBlur () {
        // this.editMode = false;

        if (!this.localUserName || this.emptyName) {
            this.localUserNameWatcher.reset();
            this.passwordChanged = false
        }
    }

    // public handleUserNameFocus () {
    //     this.editMode = true;
    // }

    public handleUserNameChange (newName) {
        this.emptyName = /^\s+$/.test(newName);
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
                this.applyService.reset();
                delete this.locked[user.email];
                this.paramUser = this.nextUserId;

                this.uriService
                    .navigateSystem(`${this.CONFIG.menus.systemSettings.baseUrl}SYSTEM_ID/users/${this.nextUserId}`, this.system)
                    .catch(error => {
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
        const incIndex = currentUserIndex + 1
        const decIndex = currentUserIndex - 1
        const nextIndex =
            (incIndex !== this.system.users?.length)
                ? incIndex
                : decIndex; // single-user list case check required here, too?
        this.nextUserId = this.system.mediaserver.cleanId(this.system.users[nextIndex].id);
    }

    public setUser () {
        if (this.system && this.system.users?.length > 0) {

            let user;
            if (this.paramUser) {
                user = this.system.users.find(this._filterUser) // maybe use this.findUser() instead?
            }
            if (typeof (user) === 'undefined') {
                if (this.menuService.section === 'users') {
                    user = this.system.users[0];
                    const userId = this.system.mediaserver.cleanId(user.id);

                    this.uriService
                        .navigateSystem(`${this.CONFIG.menus.systemSettings.baseUrl}SYSTEM_ID/users/${userId}`, this.system)
                        .catch(error => {
                            console.error(error);
                        });
                } else {
                    // shouldn't it be without `else` here? like, `finally`?
                    return;
                }
            }

            this.passwordChanged = false

            this.applyService.reset(true);
            this.selectedUser = { ...user };
            this.localUserName = this.selectedUser.name;

            this.deleteMessage = this.selectedUser.isCloud
                ? this.LANG.system.users.cloudDelete()
                : this.LANG.system.users.localDelete();

            this.menuService.detail = NxUtilsService.cleanId(this.selectedUser.id);
            if (this.selectedUser.role.name === 'Custom') {
                this.currentCustomRole = NxUtilsService.deepCopy(this.selectedUser.role);
            }

            // watcher setup
            this.setPermission(this.selectedUser.role);
            this.userEnabled.value = this.selectedUser.isEnabled;
            this.fullName.value = this.selectedUser.fullName;
            this.email.value = this.selectedUser.email;
            this.username = user.isCloud ? user.email : user.name;
            this.role = !user.isCloud && user.name === 'admin' ? 'Owner' : user.role.name;

            this.applyService.reset();

            this.settingsService.footerSubject.next(true);
            setTimeout(() => this.applyService.setVisible(this.selectedUser.canBeEdited), 0);
        }
    }

    public changePassword () {
        const dialog = this.dialogs
            .changePassword(this.system, this.selectedUser);
        dialog.then(this._onPasswordChanged)
    }

    protected _onPasswordChanged = (result) => {
        if (!result) {
            // console.log('password change cancelled')
            return
        }
        // console.log('password changed')
        this.passwordChanged = true
    }

    public setPermission (role: NxSystemRole) {
        const userRole = role?.name ?? this.selectedUser.accessRole;
        this.accessDescription = this.LANG.accessRoles[userRole]
            ? this.LANG.accessRoles[userRole].description()
            : this.LANG.accessRoles.customRole.description();
        this.selectedUser.role = role;
        this.userRole.value = role.name;
        this.role = role.name;
    }

    public updateEnabled (state) {
        this.selectedUser.isEnabled = state;
        this.userEnabled.value = state;
    }

    public routeToAccountSettings () {
        this.uriService
            .updateURI('/account')
            .catch(error => {
                console.error(error);
            });
    }

    public updateForm (e) {
        const { name, value } = e.target;
        this[name].value = value;
        this.selectedUser[name] = value;
    }
}
