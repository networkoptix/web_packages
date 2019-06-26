import { Component, Inject, OnDestroy, OnInit } from '@angular/core';
import { Location }                             from '@angular/common';
import { ActivatedRoute }                       from '@angular/router';
import { NxConfigService }                      from '../../../../services/nx-config';
import { TranslateService }                     from '@ngx-translate/core';

import { NxPageService }     from '../../../../services/page.service';
import { NxDialogsService }  from '../../../../dialogs/dialogs.service';
import { NxSettingsService } from '../settings.service';

@Component({
    selector   : 'nx-system-user-component',
    templateUrl: 'users.component.html',
    styleUrls  : ['users.component.scss']
})

export class NxSystemUsersComponent implements OnInit, OnDestroy {
    CONFIG: any = {};
    LANG: any = {};
    location: any;

    unsharing: any;
    system: any;
    locked: any;
    selectedUser: any;
    userDisconnectSystem: boolean;

    private setupDefaults() {
        this.CONFIG = this.configService.getConfig();

        this.locked = {};
        this.selectedUser = {
            email: ''
        };

        this.translate
            .getTranslation(this.translate.currentLang)
            .subscribe((lang) => {
                this.LANG = lang;
                this.pageService.setPageTitle(this.LANG.pageTitles.systems);

                this.unsharing = this.process.init(() => {
                    return this.system.deleteUser(this.selectedUser);
                }, {
                    successMessage: this.LANG.system.permissionsRemoved.replace('{{email}}', this.selectedUser.email),
                    errorPrefix   : this.LANG.errorCodes.cantSharePrefix
                }).then(() => {
                    this.locked[this.selectedUser.email] = false;
                    this.selectedUser = undefined;
                    this.settingsService.loadUsers();
                    // this.delayedUpdateSystemInfo();
                }, () => {
                    this.locked[this.selectedUser.email] = false;
                    this.selectedUser = undefined;
                    this.settingsService.loadUsers();
                    // this.delayedUpdateSystemInfo();
                });

            });
    }

    constructor(@Inject('account') private account: any,
                @Inject('process') private process: any,
                private configService: NxConfigService,
                private translate: TranslateService,
                private pageService: NxPageService,
                private dialogs: NxDialogsService,
                private settingsService: NxSettingsService,
                location: Location) {

        this.location = location;
        this.setupDefaults();
    }

    ngOnInit(): void {
        this.CONFIG = this.configService.getConfig();

        this.settingsService
            .systemSubject
            .subscribe((system) => {
                if (system) {
                    this.system = system;
                }
            });
    }

    ngOnDestroy(): void {

    }

    editShare(user) {
        this.selectedUser = user;
        // Pass user inside
        if (this.locked[user.email]) {
            return;
        }
        this.locked[user.email] = true;

        return this.dialogs
                   .share(this.system, user)
                   .then(this.settingsService.loadUsers)
                   .finally(() => {
                       this.locked[user.email] = false;
                   });
    }

    unshare(user) {
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
                    this.unsharing.run();
                } else {
                    this.locked[user.email] = false;
                }
            }, () => {
                this.locked[user.email] = false;
            });
    }
}

