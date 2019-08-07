import {
    Component, Inject,
    OnDestroy, OnInit
}                                    from '@angular/core';
import { Location }                  from '@angular/common';
import { ActivatedRoute }            from '@angular/router';
import { NxConfigService }           from '../../../../services/nx-config';
import { NxPageService }             from '../../../../services/page.service';
import { NxDialogsService }          from '../../../../dialogs/dialogs.service';
import { NxSettingsService }         from '../settings.service';
import { NxLanguageProviderService } from '../../../../services/nx-language-provider';
import { NxMenuService }             from '../../../../components/menu/menu.service';
import { NxSystemsService }          from '../../../../services/systems.service';
import { NxAccountService }          from '../../../../services/account.service';

@Component({
    selector   : 'nx-system-admin-component',
    templateUrl: 'admin.component.html',
    styleUrls  : ['admin.component.scss']
})

export class NxSystemAdminComponent implements OnInit, OnDestroy {
    CONFIG: any = {};
    LANG: any = {};
    system: any;
    systems: any;
    location: any;

    userDisconnectSystem: any;
    deletingSystem: any;
    // isMaster: boolean;
    // mergeTargetSystem: boolean;
    // currentlyMerging: boolean;
    // canMerge: boolean;
    debugMode: boolean;
    betaMode: boolean;

    private setupDefaults() {
        this.CONFIG = this.configService.getConfig();

        this.debugMode = this.CONFIG.allowDebugMode;
        this.betaMode = this.CONFIG.allowBetaMode;
        this.menuService.setSection('admin');
    }

    constructor(private accountService: NxAccountService,
                @Inject('process') private process: any,
                private route: ActivatedRoute,
                private configService: NxConfigService,
                private language: NxLanguageProviderService,
                private pageService: NxPageService,
                private dialogs: NxDialogsService,
                private systemsService: NxSystemsService,
                private settingsService: NxSettingsService,
                private menuService: NxMenuService,
                location: Location,
    ) {
        this.location = location;
        this.setupDefaults();
    }


    ngOnInit(): void {
        this.LANG = this.language.getTranslations();
        this.pageService.setPageTitle(this.LANG.pageTitles.systems);
        this.init();
    }

    init(): void {
        this.settingsService
            .systemSubject
            .subscribe((system) => {
                this.system = system;
                if (system) {
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
        this.systemsService
            .forceUpdateSystems()
            .subscribe(() => {
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

    rename() {
        return this.dialogs
                   .rename(this.system.id, this.system.info.name)
                   .then((finalName) => {
                       if (finalName) {
                           this.system.info.name = finalName;
                       }

                       this.pageService.setPageTitle(this.system.info.name + ' -');
                       this.systemsService.forceUpdateSystems();
                   });
    }

    mergeSystems() {
        this.systems = this.systemsService.getMySystems(this.accountService.getEmail(), this.system.id);

        this.system.currentlyMerging = true;
        this.settingsService.setSystem(this.system);

        return this.dialogs
                   .merge(this.system, this.systems, this.accountService)
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
}

