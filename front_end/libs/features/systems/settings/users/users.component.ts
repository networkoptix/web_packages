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
import { Subscription } from 'rxjs';
import { filter } from 'rxjs/operators';

import { NxMenuService } from '@app/menu/menu.service';
import { LanguageI18NStaticTypes } from '@common/language/language_i18n_static_types';
import { NxDialogsService } from '@dialogs/dialogs.service';
import { NxSimpleDialogsService } from '@dialogs/simple-dialogs.service';
import { NxToastService } from '@dialogs/toast.service';
import { environment } from '@environments/environment';
import { NxApplyService } from '@services/apply.service';
import type { IConfig } from '@services/nx-config/config-types';
import { NxConfigService } from '@services/nx-config/nx-config.service';
import { NxLanguageProviderService } from '@services/nx-language-provider';
import { NxPageService } from '@services/page.service';
import { NxProcessService } from '@services/process.service';
import { Process } from '@services/process.service/process';
import type { NxSystem } from '@services/system.service/system';
import type {
    NxSystemRole,
    NxSystemUser
} from '@services/system.service/user-manager/user-manager-types';
import { NxUriService } from '@services/uri.service';
import { cleanId } from '@utils/general';

import { NxSettingsService } from '../settings.service';

@UntilDestroy({ checkProperties: true })
@Component({
    selector: 'nx-system-user-component',
    templateUrl: 'users.component.html',
    styleUrls: ['users.component.scss']
})

export class NxSystemUsersComponent implements OnInit, OnDestroy {
    CONFIG: IConfig;
    readonly environment = environment;
    LANG: LanguageI18NStaticTypes;

    private paramUser: string;
    private editUser: Process;
    private locked = new Set<string>();
    private localUserName: string;

    accessDescription: string;
    selectedUser: NxSystemUser;
    systemAvailable: boolean;
    system: NxSystem;
    deleteMessage: string;
    fullName: string;
    email: string;
    username: string;
    role: string;

    private passwordChanged: boolean = false;
    private userSubscription: Subscription;

    @ViewChild('pageApply', { read: ViewContainerRef, static: true }) private pageApply: ViewContainerRef;
    @ViewChild('userEnabledForm', { read: NgForm }) private userEnabledForm: NgForm;
    @ViewChild('userRoleForm', { read: NgForm }) private userRoleForm: NgForm;
    @ViewChild('userSettingsForm', { read: NgForm }) private userSettingsForm: NgForm;

    get shouldChangePassword(): boolean {
        return this.localUserName !== this.username && !this.passwordChanged;
    }

    constructor(
        configService: NxConfigService,
        languageService: NxLanguageProviderService,
        private route: ActivatedRoute,
        private applyService: NxApplyService,
        private pageService: NxPageService,
        private dialogs: NxDialogsService,
        private simpleDialogService: NxSimpleDialogsService,
        private settingsService: NxSettingsService,
        private menuService: NxMenuService,
        private processService: NxProcessService,
        private uriService: NxUriService,
        private toastService: NxToastService,
    ) {
        this.CONFIG = configService.getConfig();
        this.LANG = languageService.translations;

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
                            `${this.CONFIG.menus.systemSettings.baseUrl}SYSTEM_ID`,
                            this.system
                        )
                        .catch(error => {
                            console.error(error);
                        });

                    return;
                }
                this.userSubscription?.unsubscribe();
                this.userSubscription = this.system.infoSubject.subscribe(() => {
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
        // DO not attempt to set the process correctly!!! Due to issues with multiple for watchers it's best to leave this alone for now.
        this.editUser = this.processService.createProcess(async () => {
            if (this.shouldChangePassword) {
                // console.log('rejected saving the form until password has changed')
                return Promise.reject({ errorString: 'password needs to change' });
            }
            if (this.userSettingsForm?.invalid) {
                return Promise.reject({ errorString: 'form is invalid' });
            }
            const user = this.selectedUser;
            if (!user.name || this.locked.has(user.email)) {
                return Promise.reject({ errorString: 'its locked' });
            }
            try {
                this.locked.add(user.email);
                user.name = this.localUserName;
                user.email = this.email;
                user.fullName = this.fullName;
                await this.system.userManager.saveUser(user, user.role);
                await this.system.getUsers(true).catch(err => console.error(err));
            } catch (err) {
                if (err?.error?.errorId === this.CONFIG.servers.errors.oldSessionErrorId) {
                    const ready = await this.simpleDialogService.refreshSession(this.system);
                    if (ready) {
                        await this.system.userManager.saveUser(user, user.role);
                        await this.system.getUsers(true);
                    }
                } else {
                    this.toastService.notify(
                        this.LANG.toastMessage.userChangesFail(),
                        this.CONFIG.toast.warning,
                    );
                }
            } finally {
                this.locked.delete(this.selectedUser.email);
                this.setUser();
            }
        }, {
            ignoreError: true
        },
        undefined,
        () => {} // Added to suppress the default logging in processes
        );
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
                        `${this.CONFIG.menus.systemSettings.baseUrl}SYSTEM_ID/users/${nextUserId}`,
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

            this.menuService.detail = cleanId(this.selectedUser.id);

            this.setPermission(this.selectedUser.role);
            this.fullName = this.selectedUser.fullName;
            this.email = this.selectedUser.email;
            this.username = user.isCloud ? user.email : user.name;
            this.role = !user.isCloud && user.name === 'admin'
                ? 'Owner'
                : user.role.name;

            setTimeout(() => {
                this.applyService.createFormWatcher(
                    'userEnabledForm',
                    this.userEnabledForm,
                    this.editUser
                );

                if (this.selectedUser.canBeEdited) {
                    this.applyService.createFormWatcher(
                        'userRoleForm',
                        this.userRoleForm,
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

    public setPermission(role: NxSystemRole): void {
        const userRole = role?.name ?? this.selectedUser.accessRole;
        this.accessDescription = this.LANG.accessRoles[userRole]
            ? this.LANG.accessRoles[userRole].description()
            : this.LANG.accessRoles.customRole.description();
        this.selectedUser.role = { ...role };
        this.role = role.name;
    }

    public routeToAccountSettings(): void {
        this.uriService
            .updateURI('/account')
            .catch(error => {
                console.error(error);
            });
    }
}
