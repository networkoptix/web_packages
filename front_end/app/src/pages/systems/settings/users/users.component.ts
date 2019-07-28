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

    systems: any;
    isMaster: boolean;
    mergeTargetSystem: boolean;
    currentlyMerging: boolean;
    canMerge: boolean;
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

        this.currentlyMerging = false;
        this.menuService.setSection('users');
    }

    constructor(@Inject('account') private account: any,
                @Inject('process') private process: any,
                @Inject('systemsProvider') private systemsProvider: any,
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
    }

    ngOnDestroy(): void {

    }

    getMergeTarget(targetSystemId) {
        return this.systemsProvider.systems.filter((system) => {
            return targetSystemId === system.id;
        });
    }

    setMergeStatus(mergeInfo) {
        if (!mergeInfo || Object.keys(mergeInfo).length === 0) {
            return;
        }
        this.currentlyMerging = true;
        this.isMaster = mergeInfo.role ? mergeInfo.role !== this.CONFIG.systemStatuses.slave : mergeInfo.masterSystemId === this.system.id;
        this.mergeTargetSystem = this.getMergeTarget(mergeInfo.anotherSystemId) || this.LANG.system.unknownName;
    }

    mergeSystems() {
        this.systems = this.systemsProvider.getMySystems(this.account.email, this.system.id);

        this.system.currentlyMerging = true;
        this.settingsService.setSystem(this.system);

        return this.dialogs
                   .merge(this.system, this.systems, this.account)
                   .then((mergeInfo) => {
                       if (mergeInfo) {
                           this.system.mergeInfo = mergeInfo;
                       }
                   }, (error) => {
                       if (!error.primarySystemName && !error.secondarySystemName) {
                           return;
                       }
                       const commonErrorMsg = this.LANG.merging.commonText
                                                  .replace('{{primarySystem}}', error.primarySystemName)
                                                  .replace('{{secondarySystem}}', error.secondarySystemName);
                       let dialogBody = '<p>' + commonErrorMsg + '</p>';
                       let responseError = this.LANG.errorCodes[error.errorText] || this.LANG.errorCodes[error.responseCode];
                       if (!responseError) {
                           responseError = this.LANG.errorCodes.unknownMergeError;
                       } else {
                           responseError = responseError.replace('{{failedSystem}}', error.failedSystemName);
                       }
                       dialogBody += '<p>' + responseError + '</p>';
                       this.dialogs.confirm(
                               dialogBody,
                               this.LANG.merging.mergeFailedTitle,
                               this.LANG.dialogs.okButton,
                               'btn-primary',
                               undefined);
                   })
                   .finally(() => {
                       this.system.currentlyMerging = false;
                       this.settingsService.setSystem(this.system);
                   });
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

