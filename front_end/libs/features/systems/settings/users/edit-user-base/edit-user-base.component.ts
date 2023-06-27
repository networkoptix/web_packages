import { Component, OnDestroy, OnInit, ViewChild, ViewContainerRef } from '@angular/core';
import { NgForm } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { untilDestroyed } from '@ngneat/until-destroy';
import { isEqual } from 'lodash-es';
import { Subscription } from 'rxjs';
import { filter } from 'rxjs/operators';

import { NxMenuService } from '@app/menu/menu.service';
import staticLang from '@common/language/language_i18n_static.json';
import { ToastType } from '@components/toast-container/toast.types';
import { NxDialogsService } from '@dialogs/dialogs.service';
import { environment } from '@environments/environment';
import { credentialsValidation, icons, menus } from '@lib/variables/static-variables';
import { NxApplyService } from '@services/apply.service';
import { NxLoginService } from '@services/login.service';
import { NxProcessService } from '@services/process.service';
import { Process } from '@services/process.service/process';
import type { NxSystem } from '@services/system.service/system';
import { NxSystemUser } from '@services/system.service/user-manager/user-manager-types.bak';
import { NxToastService } from '@services/toast.service';
import { NxUriService } from '@services/uri.service';
import { cleanId } from '@utils/general';

import { NxSettingsService } from '../../settings.service';

@Component({
    template: '',
})
export abstract class NxSystemUsersBaseComponent implements OnInit, OnDestroy {
    protected abstract setUser();
    protected abstract initProcesses();
    readonly environment = environment;
    LANG = staticLang;

    protected paramUser: string;
    protected editUser: Process;
    protected locked = new Set<string>();
    protected localUserName: string;

    selectedUser: NxSystemUser;
    systemAvailable: boolean;
    system: NxSystem;
    deleteMessage: string;
    fullName: string;
    email: string;
    username: string;
    role: string;
    credentialsValidation = credentialsValidation;
    icons = icons;
    menus = menus;

    protected passwordChanged: boolean = false;
    protected userSubscription: Subscription;

    @ViewChild('pageApply', { read: ViewContainerRef, static: true })
    protected pageApply: ViewContainerRef;
    @ViewChild('userEnabledForm', { read: NgForm }) protected userEnabledForm: NgForm;
    @ViewChild('userSettingsForm', { read: NgForm }) protected userSettingsForm: NgForm;

    get shouldChangePassword(): boolean {
        return this.localUserName !== this.username && !this.passwordChanged;
    }

    constructor(
        protected route: ActivatedRoute,
        protected applyService: NxApplyService,
        protected dialogs: NxDialogsService,
        protected loginService: NxLoginService,
        protected settingsService: NxSettingsService,
        protected menuService: NxMenuService,
        protected processService: NxProcessService,
        protected uriService: NxUriService,
        protected toastService: NxToastService,
    ) {
        this.menuService.section = 'users';
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

        this.settingsService.systemSubject$
            .pipe(
                untilDestroyed(this),
                filter(data => data !== undefined),
            )
            .subscribe(system => {
                this.system = system;
                // Route guard did not work :( ... so doing it the old way
                if (!this.system.userManager.permissions?.editUsers) {
                    this.uriService
                        .navigateSystem(`${menus.systemSettings.baseUrl}SYSTEM_ID`, this.system)
                        .catch(error => {
                            console.error(error);
                        });

                    return;
                }
                this.userSubscription?.unsubscribe();
                this.userSubscription = this.system.infoSubject
                    .pipe(untilDestroyed(this))
                    .subscribe(() => {
                        this.systemAvailable =
                            this.system.isAvailable && this.system.mergeInfo === undefined;

                        const updatedUser = this.findUser();

                        const cleanUser = { ...this.selectedUser };
                        delete cleanUser.role?.optionLabel;

                        if (
                            !this.applyService.locked &&
                            (this.paramUser === undefined ||
                                this.paramUser !== cleanId(this.selectedUser?.id) ||
                                !isEqual(updatedUser, cleanUser))
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

    public removeUser(): void {
        const user = this.selectedUser;
        if (this.locked.has(user.email)) {
            return;
        }
        this.locked.add(user.email);
        const nextUserId = this.calcNextUserId();

        this.dialogs.removeUser({ system: this.system, user }).then(result => {
            this.locked.delete(user.email);
            if (result) {
                this.paramUser = nextUserId;

                this.uriService
                    .navigateSystem(
                        `${menus.systemSettings.baseUrl}SYSTEM_ID/users/${nextUserId}`,
                        this.system,
                    )
                    .catch(error => {
                        console.error(error);
                    });

                this.menuService.detail = nextUserId;
            }
        });
    }

    public changePassword(): void {
        this.dialogs
            .changePassword({ system: this.system, user: this.selectedUser })
            .then(result => {
                this.passwordChanged = result;
            });
    }

    protected calcNextUserId(): string {
        const currentUserIndex = this.system.userManager.users.findIndex(user => {
            return user.id === this.selectedUser.id;
        });
        const incIndex = currentUserIndex + 1;
        const decIndex = currentUserIndex - 1;
        const nextIndex = incIndex !== this.system.userManager.users?.length ? incIndex : decIndex;
        // single-user list case check required here, too?
        return cleanId(this.system.userManager.users[nextIndex].id);
    }

    protected checkIfEditable(): Promise<Error> {
        if (this.shouldChangePassword) {
            return Promise.reject({ errorString: 'password needs to change' });
        }
        if (this.userSettingsForm?.invalid) {
            return Promise.reject({ errorString: 'form is invalid' });
        }
        if (!this.selectedUser.name || this.locked.has(this.selectedUser.email)) {
            return Promise.reject({ errorString: 'its locked' });
        }
    }

    protected findUser(): NxSystemUser {
        return this.system.userManager.users.find(user => cleanId(user.id) === this.paramUser);
    }

    protected formatUser(user: NxSystemUser): NxSystemUser {
        user.name = this.localUserName;
        user.email = this.email;
        user.fullName = this.fullName;
        return user;
    }

    protected routeToAccountSettings(): void {
        this.uriService.updateURI('/account').catch(error => {
            console.error(error);
        });
    }

    protected routeToFirstUser(): Promise<boolean | void> {
        const user = this.system.userManager.users[0];
        const userId = cleanId(user.id);

        return this.uriService
            .navigateSystem(`${menus.systemSettings.baseUrl}SYSTEM_ID/users/${userId}`, this.system)
            .catch(error => {
                console.error(error);
            });
    }

    protected setUserHelper(user: NxSystemUser): void {
        this.passwordChanged = false;

        this.selectedUser = { ...user };
        delete this.selectedUser.role?.optionLabel; // clean any leftovers
        this.localUserName = this.selectedUser.name;

        this.deleteMessage = this.selectedUser.isCloud
            ? this.LANG.system.users.cloudDelete
            : this.LANG.system.users.localDelete;

        this.menuService.detail = cleanId(this.selectedUser.id);

        this.fullName = this.selectedUser.fullName;
        this.email = this.selectedUser.email;
        this.username = user.isCloud ? user.email : user.name;
    }

    protected showUserChangeFailedToast(): void {
        this.toastService.notify(this.LANG.toastMessage.userChangesFail, ToastType.Warning);
    }
}
