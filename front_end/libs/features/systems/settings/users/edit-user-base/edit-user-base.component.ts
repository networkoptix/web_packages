import {
    Component,
    Input,
    OnChanges,
    OnDestroy,
    OnInit,
    signal,
    ViewChild,
    ViewContainerRef,
} from '@angular/core';
import { NgForm } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { untilDestroyed } from '@ngneat/until-destroy';

import staticLang from '@common/language/language_i18n_static.json';
import { ToastType } from '@components/toast-container/toast.types';
import { NxDialogsService } from '@dialogs/dialogs.service';
import { environment } from '@environments/environment';
import { credentialsValidation, icons, menus } from '@lib/variables/static-variables';
import { NxMenuService } from '@menu/menu.service';
import { NxApplyService } from '@services/apply.service';
import { NxProcessService } from '@services/process.service';
import { Process } from '@services/process.service/process';
import { NxUser, UserType } from '@services/system-user.types';
import type { NxSystem } from '@services/system.service/system';
import { NxToastService } from '@services/toast.service';
import { NxUriService } from '@services/uri.service';
import { cleanId } from '@utils/general';
import { NgChanges } from '@utils/ng-changes';

@Component({
    template: '',
})
export abstract class NxSystemUsersBaseComponent implements OnInit, OnDestroy, OnChanges {
    protected abstract initProcesses();
    protected abstract changeUser(user: NxUser);

    readonly environment = environment;
    readonly credentialsValidation = credentialsValidation;
    readonly icons = icons;
    readonly menus = menus;
    readonly LANG = staticLang;
    readonly UserType = UserType;

    @Input() system: NxSystem;
    @Input() selectedUser: NxUser;

    protected editUser: Process;
    protected locked = new Set<string>();
    protected isCloud = signal(false);
    protected isLdap = signal(false);
    protected isLocal = signal(false);
    protected isMe = signal(false);
    protected canBeEdited = signal(false);

    systemAvailable: boolean;
    deleteMessage: string;
    fullName: string;
    email: string;
    username: string;
    role: string;

    @ViewChild('pageApply', { read: ViewContainerRef, static: true })
    protected pageApply: ViewContainerRef;
    @ViewChild('userEnabledForm', { read: NgForm }) protected userEnabledForm: NgForm;
    @ViewChild('userSettingsForm', { read: NgForm }) protected userSettingsForm: NgForm;

    constructor(
        protected route: ActivatedRoute,
        protected applyService: NxApplyService,
        protected dialogs: NxDialogsService,
        protected menuService: NxMenuService,
        protected processService: NxProcessService,
        protected uriService: NxUriService,
        protected toastService: NxToastService,
    ) {
        this.menuService.selectedSection.set('users');
    }

    ngOnChanges(changes: NgChanges<NxSystemUsersBaseComponent>): void {
        const user = changes.selectedUser.currentValue;
        this.menuService.selectedDetailsSection.set(user?.id);
        if (user) {
            this.locked.clear();
            this.setUserHelper(user);
            this.changeUser(user);
        }
    }

    public ngOnInit(): void {
        this.applyService.initPageFormsWatcher(this.pageApply);
        this.system.infoSubject.pipe(untilDestroyed(this)).subscribe(() => {
            this.systemAvailable = this.system.isAvailable && this.system.mergeInfo === undefined;
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
                this.uriService
                    .navigateSystem(
                        `${menus.systemSettings.baseUrl}SYSTEM_ID/users/${nextUserId}`,
                        this.system,
                    )
                    .catch(error => {
                        console.error(error);
                    });

                this.menuService.selectedDetailsSection.set(nextUserId);
            }
        });
    }

    public changePassword(): void {
        this.dialogs.changePassword({ system: this.system, user: this.selectedUser });
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
        if (this.userSettingsForm?.invalid) {
            return Promise.reject({ errorString: 'form is invalid' });
        }
        if (!this.selectedUser.name || this.locked.has(this.selectedUser.email)) {
            return Promise.reject({ errorString: 'its locked' });
        }
    }

    protected formatUser(user: NxUser): NxUser {
        user.name = this.username;
        user.email = this.email;
        user.fullName = this.fullName;
        return user;
    }

    protected routeToAccountSettings(): void {
        this.uriService.updateURI('/account').catch(error => {
            console.error(error);
        });
    }

    protected setUserHelper(user: NxUser): void {
        const currentUser = this.system.permissionManager.currentUser();
        this.isCloud.set(user.type === UserType.cloud);
        this.isLdap.set(user.type === UserType.ldap);
        this.isLocal.set(user.type === UserType.local);
        this.isMe.set(currentUser.id === user.id);
        this.canBeEdited.set(user.canBeEdited);

        this.deleteMessage = this.isCloud()
            ? this.LANG.system.users.cloudDelete
            : this.LANG.system.users.localDelete;

        this.menuService.selectedDetailsSection.set(cleanId(user.id));

        this.fullName = user.fullName;
        this.email = user.email;
        this.username = this.isCloud() ? user.email : user.name;
    }

    protected showUserChangeFailedToast(): void {
        this.toastService.notify(this.LANG.toastMessage.userChangesFail, ToastType.Warning);
    }
}
