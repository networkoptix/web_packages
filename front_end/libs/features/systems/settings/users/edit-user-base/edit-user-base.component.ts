import {
    AfterViewInit,
    Component,
    computed,
    EventEmitter,
    Input,
    OnChanges,
    OnInit,
    Output,
    signal,
    ViewChild,
    ViewContainerRef,
} from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { untilDestroyed } from '@ngneat/until-destroy';
import { Subject } from 'rxjs';

import { ToastType } from '@components/toast-container/toast.types';
import { NxDialogsService } from '@dialogs/dialogs.service';
import { environment } from '@environments/environment';
import staticLang from '@language_static';
import { NxMenuService } from '@menu/menu.service';
import { FormActions } from '@services/apply.service/apply.service.type';
import { NxProcessService } from '@services/process.service';
import { Process } from '@services/process.service/process';
import { NxUser, UserType } from '@services/system-user.types';
import type { NxSystem } from '@services/system.service/system';
import { NxToastService } from '@services/toast.service';
import { NxUriService } from '@services/uri.service';
import { credentialsValidation, icons, menus } from '@static-variables';
import { cleanIdLegacy } from '@utils/general';
import { NgChanges } from '@utils/ng-changes';
import { NxFormGroup } from '@utils/reactive-form-builder';

import { UserFormControls } from '../user-form.types';

interface EditActions {
    enable: boolean;
    changeInfo: boolean;
    changePassword: boolean;
    changePermissions: boolean;
    delete: boolean;
}

@Component({
    template: '',
})
export abstract class NxSystemUsersBaseComponent implements OnInit, OnChanges, AfterViewInit {
    protected abstract initProcesses(): void;
    protected abstract changeUser(user: NxUser): void;
    protected abstract resetForm(): void;

    readonly environment = environment;
    readonly credentialsValidation = credentialsValidation;
    readonly icons = icons;
    readonly menus = menus;
    readonly LANG = staticLang;
    readonly UserType = UserType;

    @Input() system: NxSystem;
    @Input() selectedUser: NxUser; // Post 23.3.x releases convert this into a signal input
    selectedUser$$ = signal<NxUser | undefined>(undefined);
    @Output() userForm = new EventEmitter<NxFormGroup<UserFormControls>>();
    @Output() formActions = new EventEmitter<FormActions>();
    protected removeOldForm$ = new Subject<boolean>();

    protected editUser: Process;
    protected locked = new Set<string>();
    protected isCloud$$ = signal(false);
    protected isLdap$$ = signal(false);
    protected isWebadmin$$ = signal(false);
    protected isTemporary$$ = signal(false);
    protected isMe$$ = signal(false);
    protected canBeEdited$$ = computed(() => {
        this.system.permissionManager.currentUser$$();
        const selectedUser = this.selectedUser$$();
        return this.system.isOnline && selectedUser?.canBeEdited;
    });
    protected hasCustomPermissions$$ = signal(false);

    protected editPermissions$$ = computed<EditActions>(() => {
        const isWebadmin = this.isWebadmin$$();
        const isMe = this.isMe$$();
        const isTemporary = this.isTemporary$$();
        const canEdit = this.canBeEdited$$();
        if (!canEdit && !isMe) {
            return {
                enable: false,
                changeInfo: false,
                changePassword: false,
                changePermissions: false,
                delete: false,
            };
        }
        return {
            enable: !isMe,
            changePassword: isWebadmin && !isTemporary,
            changePermissions: !isMe && !isTemporary,
            changeInfo: (isWebadmin || !isMe) && !isTemporary,
            delete: !isMe,
        };
    });

    systemAvailable: boolean;
    deleteMessage: string;
    fullName: string;
    email: string;
    username: string;
    role: string;

    inEditMode$$ = signal<boolean>(false);

    @ViewChild('pageApply', { read: ViewContainerRef, static: true })
    protected pageApply: ViewContainerRef;

    constructor(
        protected route: ActivatedRoute,
        protected dialogs: NxDialogsService,
        protected menuService: NxMenuService,
        protected processService: NxProcessService,
        protected uriService: NxUriService,
        protected toastService: NxToastService,
    ) {
        this.menuService.selectedSection$$.set('users');
    }

    ngOnChanges(changes: NgChanges<NxSystemUsersBaseComponent>): void {
        const user = changes.selectedUser?.currentValue;
        if (user && !this.inEditMode$$()) {
            this.selectedUser$$.set(user);
            this.menuService.selectedDetailsSection$$.set(user.id);
            this.locked.clear();
            this.setUserHelper(user);
            this.changeUser(user);
        }
    }

    public ngOnInit(): void {
        this.system.infoSubject.pipe(untilDestroyed(this)).subscribe(() => {
            this.systemAvailable = this.system.isAvailable && this.system.mergeInfo === undefined;
        });

        this.userForm.pipe(untilDestroyed(this)).subscribe(form => {
            this.inEditMode$$.set(form?.dirty || false);
        });

        this.initProcesses();
    }

    ngAfterViewInit(): void {
        this.formActions.emit({ applyFunc: this.editUser, discardFunc: this.resetForm });
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

                this.menuService.selectedDetailsSection$$.set(nextUserId);
            }
        });
    }

    public changePassword(): void {
        this.dialogs.changePassword({
            system: this.system,
            user: this.selectedUser,
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
        return cleanIdLegacy(this.system.userManager.users[nextIndex].id) ?? '';
    }

    protected checkIfEditable(form: NxFormGroup<UserFormControls>): Promise<Error | void> {
        if (form.invalid) {
            return Promise.reject({ errorString: 'form is invalid' });
        }
        if (!this.selectedUser.name || this.locked.has(this.selectedUser.email)) {
            return Promise.reject({ errorString: 'its locked' });
        }
        return Promise.resolve();
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
        const currentUser = this.system.permissionManager.currentUser$$();
        this.isCloud$$.set(user.type === UserType.cloud);
        this.isLdap$$.set(user.type === UserType.ldap);
        this.isWebadmin$$.set(user.type === UserType.local);
        this.isTemporary$$.set(user.type === UserType.temporaryLocal);
        this.isMe$$.set(currentUser?.id === user.id);
        this.hasCustomPermissions$$.set(user.hasCustomPermissions);

        this.deleteMessage = this.isCloud$$()
            ? this.LANG.system.users.cloudDelete
            : this.LANG.system.users.localDelete;

        this.menuService.selectedDetailsSection$$.set(cleanIdLegacy(user.id) ?? '');

        this.fullName = user.fullName;
        this.email = user.email;
        this.username = this.isCloud$$() ? user.email : user.name;
    }

    protected showUserChangeFailedToast(): void {
        this.toastService.notify(this.LANG.toastMessage.userChangesFail, ToastType.Warning);
    }
}
