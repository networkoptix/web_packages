import { Component, Inject, OnDestroy, OnInit } from '@angular/core';
import { Location }                             from '@angular/common';
import { ActivatedRoute }                       from '@angular/router';
import { NxConfigService }                      from '../../../../services/nx-config';
import { TranslateService }                     from '@ngx-translate/core';

import { NxPageService }     from '../../../../services/page.service';
import { NxDialogsService }  from '../../../../dialogs/dialogs.service';
import { NxSettingsService } from '../settings.service';

@Component({
    selector   : 'nx-system-admin-component',
    templateUrl: 'admin.component.html',
    styleUrls  : ['admin.component.scss']
})

export class NxSystemAdminComponent implements OnInit, OnDestroy {
    CONFIG: any = {};
    LANG: any = {};
    system: any;
    systems;
    any;
    location: any;

    userDisconnectSystem: any;
    deletingSystem: any;
    currentlyMerging: boolean;
    isMaster: boolean;
    mergeTargetSystem: boolean;
    canMerge: boolean;
    debugMode: boolean;
    betaMode: boolean;

    private setupDefaults() {
        this.CONFIG = this.configService.getConfig();

        this.debugMode = this.CONFIG.allowDebugMode;
        this.betaMode = this.CONFIG.allowBetaMode;
        this.currentlyMerging = false;

        this.translate
            .getTranslation(this.translate.currentLang)
            .subscribe((lang) => {
                this.LANG = lang;
                this.pageService.setPageTitle(this.LANG.pageTitles.systems);


            });
    }

    constructor(@Inject('account') private account: any,
                @Inject('process') private process: any,
                @Inject('systemsProvider') private systemsProvider: any,
                private route: ActivatedRoute,
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

                    this.canMerge = this.system.canMerge && this.system.isOnline || this.CONFIG.cloudMerge;
                    if (this.system.mergeInfo) {
                        this.setMergeStatus(this.system.mergeInfo);
                    }

                    if (this.system.mergeInfo) {
                        this.setMergeStatus(this.system.mergeInfo);
                    } else {
                        if (this.currentlyMerging) {
                            this.dialogs
                                .notify(
                                        this.LANG.system.mergeSuccess,
                                        'success',
                                        true
                                );
                        }
                        this.currentlyMerging = false;
                    }

                    this.deletingSystem = this.process.init(() => {
                        return this.system.deleteFromCurrentAccount();
                    }, {
                        successMessage: this.LANG.system.successDeleted.replace('{{systemName}}', this.system.info.name),
                        errorPrefix   : this.LANG.errorCodes.cantUnshareWithMeSystemPrefix
                    }).then(this.updateAndGoToSystems);
                }
            });

    }

    ngOnDestroy(): void {

    }

    share() {
        // Call share dialog, run process inside
        this.settingsService.share();
    }

    disconnect() {
        if (this.system.isMine) {
            // User is the owner. Deleting system means unbinding it and disconnecting all accounts
            // dialogs.confirm(this.LANG.system.confirmDisconnect, this.LANG.system.confirmDisconnectTitle, this.LANG.system.confirmDisconnectAction, 'danger').
            this.dialogs.disconnect(this.system.id)
                .then((result) => {
                    if (result) {
                        this.updateAndGoToSystems();
                    }
                });
        }
    }

    updateAndGoToSystems() {
        this.userDisconnectSystem = true;
        this.systemsProvider
            .forceUpdateSystems()
            .then(() => {
                setTimeout(() => {
                    this.location.path('/systems');
                });
            });
    }

    delete() {
        if (!this.system.isMine) {
            // User is not owner. Deleting means he'll lose access to it
            this.dialogs.confirm(this.LANG.system.confirmUnshareFromMe, this.LANG.system.confirmUnshareFromMeTitle, this.LANG.system.confirmUnshareFromMeAction, 'btn-danger', 'Cancel')
                .then((result) => {
                    if (result) {
                        this.deletingSystem.run();
                    }
                });
        }
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

    rename() {
        return this.dialogs
                   .rename(this.system.id, this.system.info.name)
                   .then((finalName) => {
                       if (finalName) {
                           this.system.info.name = finalName;
                       }

                       this.pageService.setPageTitle(this.system.info.name + ' -');
                       this.systemsProvider.forceUpdateSystems();
                   });
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

}

