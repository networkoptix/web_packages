import {
    Component, Inject, OnDestroy,
    OnInit, ViewContainerRef
}                                               from '@angular/core';
import { Location }                             from '@angular/common';
import { ActivatedRoute }                       from '@angular/router';
import { filter }                               from 'rxjs/operators';
import { NxDialogsService }                     from '../../../../dialogs';
import { NxSettingsService }                    from '../settings.service';
import { NxMenuService }                        from '../../../../components/menu';
import { LanguageI18NStaticTypes }              from '../../../../../language_i18n_static_types';
import { Subscription }                         from 'rxjs';
import { AutoUnsubscribe }                      from 'ngx-auto-unsubscribe';
import { NxConfigService, IConfig }             from '../../../../services/nx-config';
import { NxPageService }                        from '../../../../services/page.service';
import { NxAccountService }                     from '../../../../services/account.service';
import { NxLanguageProviderService }            from '../../../../services/nx-language-provider';
import { NxUtilsService }                       from '../../../../services/utils.service';
import { NxSystem, NxSystemRole, NxSystemUser } from '../../../../services/system.service';
import { NxProcessService }                     from '../../../../services/process.service';
import { NxUriService }                         from '../../../../services/uri.service';
import { NxApplyService, Watcher }              from '../../../../services/apply.service';

@AutoUnsubscribe()
@Component({
    selector    : 'nx-system-user-component',
    templateUrl : 'users.component.html',
    styleUrls   : ['users.component.scss'],
})

export class NxSystemUsersComponent implements OnInit, OnDestroy {
    CONFIG: IConfig;
    LANG: LanguageI18NStaticTypes;
    location: any;
    paramUser: any;
    accessDescription: string;
    editUser: any;
    locked: any;
    nextUserId: string;
    selectedUser: NxSystemUser;
    systemAvailable: boolean;
    system: NxSystem;
    viewContainerRef: ViewContainerRef;
    deleteMessage: string;

    userEnabled = new Watcher<boolean>();
    userRole = new Watcher<string>();
    name = new Watcher<string>();
    fullName = new Watcher<string>();
    email = new Watcher<string>();

    private routeParamsSubscription: Subscription;
    private systemSubscription: Subscription;
    private userSubscription: Subscription;

    private setupDefaults() {
        this.locked = {};
        this.menuService.setSection('users');
    }

    constructor(
        configService: NxConfigService,
        @Inject(ViewContainerRef) viewContainerRef,
        private route: ActivatedRoute,
        private accountService: NxAccountService,
        private applyService: NxApplyService,
        private language: NxLanguageProviderService,
        private pageService: NxPageService,
        private dialogs: NxDialogsService,
        private settingsService: NxSettingsService,
        private menuService: NxMenuService,
        private processService: NxProcessService,
        private uriService: NxUriService,
        location: Location
    ) {
        this.location = location;
        this.viewContainerRef = viewContainerRef;
        this.CONFIG = configService.getConfig();

        this.setupDefaults();
    }

    ngOnInit(): void {
        this.LANG = this.language.getTranslations();

        this.routeParamsSubscription = this.route
            .params
            .subscribe(params => {
                if (params.userId) {
                    this.menuService.setDetailsSection(params.userId);
                    this.paramUser = params.userId;
                    this.setUser();
                }
            });

        this.systemSubscription = this.settingsService.systemSubject
            .pipe(filter(data => data !== undefined))
            .subscribe((system) => {
                this.system = system;
                this.pageService.setPageTitle(this.LANG.pageTitles.systemName.replace('{{systemName}}', this.system.info.name));
                // Route guard did not worked :( ... so doing it the old way
                if (!this.system.permissions || !this.system.permissions.editUsers) {

                    this.uriService
                        .updateURI('systems/' + this.system.id, {})
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
                    if (!this.applyService.locked) {
                        this.setUser();
                    }
                });
            });

        this.initProcesses();

        this.applyService
            .initPageWatcher(this.viewContainerRef, this.editUser, () => {
                this.selectedUser.isEnabled = this.userEnabled.originalValue;
                this.selectedUser.role = this.system.accessRoles.find(role => role.name === this.userRole.originalValue);
                this.applyService.reset();
            },
            [
                this.userEnabled,
                this.userRole,
                this.name,
                this.fullName,
                this.email
            ]);
    }

    ngOnDestroy(): void {}

    initProcesses(): void {
        this.editUser = this.processService.createProcess(() => {
            const user = this.selectedUser;
            if (!user.name || this.locked[user.email]) {
                return Promise.reject();
            }
            this.locked[user.email] = true;
            return this.system.saveUser(user, user.role).then(() => {
                return this.system.getUsers(true);
            }).then(() => {
                this.locked[user.email] = false;
                return;
            });
        }, {
            ignoreError: true
        }).then(() => {
            setTimeout(() => {
                this.applyService.hardReset();
                this.setUser();
                this.applyService.reset();
            });
        });
    }

    removeUser() {
        const user = this.selectedUser;
        if (this.locked[user.email]) {
            return;
        }
        this.locked[user.email] = true;
        this.calcNextUserId();

        this.dialogs.removeUser(this.system, user).then((result) => {
            if (result) {
                this.applyService.reset();
                delete this.locked[user.email];
                this.paramUser = this.nextUserId;

                this.uriService
                    .updateURI(`systems/${this.system.id}/users/${this.nextUserId}`)
                    .catch(error => {
                        console.error(error);
                    });

                this.menuService.setDetailsSection(this.nextUserId);
            } else {
                this.locked[user.email] = false;
            }
        });
    }

    calcNextUserId() {
        const currentUserIndex = this.system.users.findIndex((user) => {
            return user.id === this.selectedUser.id;
        });
        const nextUserIndex = currentUserIndex + 1 !== this.system.users.length ? currentUserIndex + 1 : currentUserIndex - 1;
        this.nextUserId = this.system.mediaserver.cleanId(this.system.users[nextUserIndex].id);
    }

    setUser() {
        if (this.system && this.system.users.length > 0) {
            let user;
            if (this.paramUser) {
                user = this.system.users.find((user: any) => {
                    return NxUtilsService.cleanId(user.id) === this.paramUser;
                });
            }
            if (typeof (user) === 'undefined') {
                user = this.system.users[0];
                const userId = this.system.mediaserver.cleanId(user.id);

                this.uriService
                    .updateURI(`systems/${this.system.id}/users/${userId}`)
                    .catch(error => {
                        console.error(error);
                    });
            }

            // If there's no users skip setting section and permissions
            if (typeof (user) === 'undefined') {
                return;
            }
            this.applyService.hardReset();
            this.selectedUser = { ...user };

            this.deleteMessage = this.selectedUser.isCloud ?
                this.LANG.system.users.cloudDelete : this.LANG.system.users.localDelete;

            this.menuService.setDetailsSection(NxUtilsService.cleanId(this.selectedUser.id));
            // watchers set
            this.setPermission(this.selectedUser.role);
            this.userEnabled.value = this.selectedUser.isEnabled;
            this.name.value = this.selectedUser.name;
            this.fullName.value = this.selectedUser.fullName;
            this.email.value = this.selectedUser.email;

            this.applyService.reset();

            this.settingsService.footerSubject.next(true);
            setTimeout(() => this.applyService.setVisible(this.selectedUser.canBeEdited));
        }
    }

    changePassword() {
        return this.dialogs
            .changePassword(this.system, this.selectedUser);
    }

    setPermission(role: NxSystemRole | any) {
        const userRole = role && role.name ? role.name : this.selectedUser.accessRole;
        this.accessDescription = this.LANG.accessRoles[userRole]
            ? this.LANG.accessRoles[userRole].description
            : this.LANG.accessRoles.customRole.description;
        this.selectedUser.role = role;
        this.userRole.value = role.name;
    }

    updateEnabled(state) {
        this.selectedUser.isEnabled = state;
        this.userEnabled.value = state;
    }

    routeToAccountSettings() {
        this.uriService
            .updateURI('/account')
            .catch(error => {
                console.error(error);
            });
    }

    updateForm(e) {
        const { name, value } = e.target;
        this[name].value = value;
        this.selectedUser[name] = value;
    }
}

