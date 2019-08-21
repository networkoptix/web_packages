import { Component, Inject, OnDestroy, OnInit } from '@angular/core';
import { Location }                             from '@angular/common';
import { ActivatedRoute }                       from '@angular/router';
import { NxConfigService }                      from '../../../../services/nx-config';

import { NxPageService }             from '../../../../services/page.service';
import { NxDialogsService }          from '../../../../dialogs/dialogs.service';
import { NxSettingsService }         from '../settings.service';
import { NxLanguageProviderService } from '../../../../services/nx-language-provider';
import { NxMenuService }             from '../../../../components/menu/menu.service';
import { NxAccountService }          from '../../../../services/account.service';
import { NxProcessService }          from '../../../../services/process.service';

@Component({
    selector   : 'nx-system-user-component',
    templateUrl: 'users.component.html',
    styleUrls  : ['users.component.scss']
})

export class NxSystemUsersComponent implements OnInit, OnDestroy {
    CONFIG: any = {};
    LANG: any = {};
    location: any;
    paramUser: any;
    accessDescription: string;
    locked: any;
    removingUserProcess: any;
    selectedUser: any;
    systemAvailable: boolean;
    system: any;

    private setupDefaults() {
        this.CONFIG = this.configService.getConfig();

        this.locked = {};
        this.menuService.setSection('users');
    }

    constructor(private route: ActivatedRoute,
                private accountService: NxAccountService,
                private configService: NxConfigService,
                private language: NxLanguageProviderService,
                private pageService: NxPageService,
                private dialogs: NxDialogsService,
                private settingsService: NxSettingsService,
                private menuService: NxMenuService,
                private processService: NxProcessService,
                location: Location) {

        this.location = location;
        this.setupDefaults();
    }

    ngOnInit(): void {
        this.LANG = this.language.getTranslations();
        this.pageService.setPageTitle(this.LANG.pageTitles.systems);

        this.route
            .params
            .subscribe(params => {
                if (params.userId) {
                    this.menuService.setSubSection(params.userId);
                    this.paramUser = params.userId;
                    this.setUser();
                }
            });


        this.init();
    }

    init(): void {
        this.CONFIG = this.configService.getConfig();
        this.settingsService.systemSubject.subscribe((system) => {
            this.system = system;
            if (system) {
                this.systemAvailable = this.system.isAvailable && this.system.mergeInfo === undefined;
                if (!this.selectedUser || !this.selectedUser.email) {
                    this.setUser();
                }
            }
        });
        this.removingUserProcess = this.processService.createProcess(() => {
            return this.system.deleteUser(this.selectedUser);
        }, {
            successMessage: this.LANG.system.permissionsRemoved.replace('{{email}}', this.selectedUser ? this.selectedUser.email : ''),
            errorPrefix   : this.LANG.errorCodes.cantSharePrefix
        }).then(() => {
            this.locked[this.selectedUser.email] = false;
            this.selectedUser = undefined;
            this.settingsService.loadUsers();
        });
    }

    ngOnDestroy(): void {

    }

    addUser() {
        // Call share dialog, run process inside
        this.settingsService.addUser().then(() => {});
    }

    editShare(user) {
        this.selectedUser = user;
        // Pass user inside
        if (this.locked[user.email]) {
            return;
        }
        this.locked[user.email] = true;

        return this.dialogs
                   .addUser(this.accountService, this.system, user)
                   .then(this.settingsService.loadUsers)
                   .finally(() => {
                       this.locked[user.email] = false;
                   });
    }

    removeUser(user) {
        this.selectedUser = user;
        if (this.accountService.getEmail() === user.email) {
            // return this.delete();
        }
        if (this.locked[user.email]) {
            return;
        }
        this.locked[user.email] = true;

        this.dialogs
            .confirm(this.LANG.system.confirmUnshare,
                this.LANG.system.confirmUnshareTitle,
                this.LANG.system.confirmUnshareAction,
                'btn-danger', this.LANG.dialogs.cancelButton)
            .then((result) => {
                if (result) {
                    // Run a process of sharing
                    // $poll.cancel(pollingSystemUpdate);
                    this.selectedUser = user;
                    this.removingUserProcess.run();
                } else {
                    this.locked[user.email] = false;
                }
            }, () => {
                this.locked[user.email] = false;
            });
    }

    setUser() {
        if (this.system && this.system.users.length > 0) {
            if (this.paramUser) {
                this.selectedUser = this.system.users.filter((user: any) => {
                    if (user.id.replace(/{|}/g, '') === this.paramUser) {
                        return true;
                    }
                })[0];
            }
            if (typeof(this.selectedUser) === 'undefined') {
                this.selectedUser = this.system.users[0];
            }

            // If there's no users skip setting section and permissions
            if (typeof(this.selectedUser) === 'undefined') {
                return;
            }
            this.menuService.setSubSection(this.selectedUser.id.replace(/{|}/g, ''));
            this.setPermission(this.selectedUser.role);
        }
    }

    setPermission(role: any) {
        const userRole = role && role.name ? role.name : this.selectedUser.accessRole;
        this.accessDescription = this.LANG.accessRoles[userRole] ?
                this.LANG.accessRoles[userRole].description :
                this.LANG.accessRoles.customRole.description;
    }
    updateEnabled(state) {
        this.selectedUser.isEnabled = state;
    }
}

