import { Component, Inject, OnDestroy, OnInit } from '@angular/core';
import { Location }                             from '@angular/common';
import { ActivatedRoute }                       from '@angular/router';
import { NxConfigService }                      from '../../../../services/nx-config';
import { TranslateService }                     from '@ngx-translate/core';

import { NxPageService }             from '../../../../services/page.service';
import { NxDialogsService }          from '../../../../dialogs/dialogs.service';
import { NxSettingsService }         from '../settings.service';
import { NxLanguageProviderService } from '../../../../services/nx-language-provider';
import { NxMenuService }             from '../../../../components/menu/menu.service';

@Component({
    selector   : 'nx-system-user-component',
    templateUrl: 'users.component.html',
    styleUrls  : ['users.component.scss']
})

export class NxSystemUsersComponent implements OnInit, OnDestroy {
    CONFIG: any = {};
    LANG: any = {};
    location: any;

    accessDescription: string;
    locked: any;
    removingUserProcess: any;
    selectedUser: any;
    selectedPermission: {
        name: ''
    };
    system: any;
    systemAvailable: boolean;

    private setupDefaults() {
        this.CONFIG = this.configService.getConfig();

        this.locked = {};
        this.selectedUser = {
            email: ''
        };
        this.menuService.setSection('users');
    }

    constructor(@Inject('account') private account: any,
                @Inject('process') private process: any,
                private configService: NxConfigService,
                private language: NxLanguageProviderService,
                private pageService: NxPageService,
                private dialogs: NxDialogsService,
                private settingsService: NxSettingsService,
                private menuService: NxMenuService,
                location: Location) {

        this.location = location;
        this.setupDefaults();
    }

    ngOnInit(): void {
        this.LANG = this.language.getTranslations();
        this.pageService.setPageTitle(this.LANG.pageTitles.systems);
        this.init();
    }

    init(): void {
        this.CONFIG = this.configService.getConfig();
        this.settingsService.systemSubject.subscribe((system) => {
            this.system = system;
            if (this.system.users.length > 0) {
                this.setUser(this.system.users[0]);
            }
            this.systemAvailable = this.system.isAvailable && this.system.mergeInfo !== 'undefined';
        });

        this.removingUserProcess = this.process.init(() => {
            return this.system.deleteUser(this.selectedUser);
        }, {
            successMessage: this.LANG.system.permissionsRemoved.replace('{{email}}', this.selectedUser.email),
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
        this.settingsService.addUser();
    }

    editShare(user) {
        this.selectedUser = user;
        // Pass user inside
        if (this.locked[user.email]) {
            return;
        }
        this.locked[user.email] = true;

        return this.dialogs
                   .addUser(this.system, user)
                   .then(this.settingsService.loadUsers)
                   .finally(() => {
                       this.locked[user.email] = false;
                   });
    }

    removeUser(user) {
        this.selectedUser = user;
        if (this.account.email === user.email) {
            // return this.delete();
        }
        if (this.locked[user.email]) {
            return;
        }
        this.locked[user.email] = true;

        this.dialogs.confirm(this.LANG.system.confirmUnshare,
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

    setUser(user) {
        this.selectedUser = user;
        console.log(user);
        this.setPermission(this.selectedUser.role);
    }

    setPermission(role: any) {
        this.selectedPermission = role;
        this.accessDescription = this.LANG.accessRoles[this.selectedPermission.name] ?
                this.LANG.accessRoles[this.selectedPermission.name].description :
                this.LANG.accessRoles.customRole.description;
    }
    updateEnabled(state) {
        this.selectedUser.isEnabled = state;
    }
}

