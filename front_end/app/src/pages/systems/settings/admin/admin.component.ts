import { Component, OnDestroy, OnInit } from '@angular/core';
import { Router }                       from '@angular/router';
import { NxConfigService, IConfig }     from '../../../../services/nx-config';
import { NxPageService }                from '../../../../services/page.service';
import { NxDialogsService }             from '../../../../dialogs/dialogs.service';
import { NxSettingsService }            from '../settings.service';
import { NxLanguageProviderService }    from '../../../../services/nx-language-provider';
import { NxMenuService }                from '../../../../components/menu/menu.service';
import { NxSystemsService }             from '../../../../services/systems.service';
import { NxAccountService }             from '../../../../services/account.service';
import { NxProcessService }             from '../../../../services/process.service';
import { NxSystem }                     from '../../../../services/system.service';
import { Subscription }                 from 'rxjs';
import { filter, throttleTime }         from 'rxjs/operators';
import { AutoUnsubscribe }              from 'ngx-auto-unsubscribe';
import { LanguageI18NStaticTypes }      from '../../../../../language_i18n_static_types';
import { NxCloudApiService }            from '../../../../services/nx-cloud-api';

interface Settings {
    disconnectDisabled: boolean;
    mergeDisabled: boolean;
    renameDisabled: boolean;
    showMerge: boolean;
}

@AutoUnsubscribe()
@Component({
    selector : 'nx-system-admin-component',
    templateUrl : 'admin.component.html',
    styleUrls : ['admin.component.scss']
})
export class NxSystemAdminComponent implements OnInit, OnDestroy {
    CONFIG: IConfig;
    LANG: LanguageI18NStaticTypes;
    system: NxSystem;
    systems: any;
    peerSystems: any[] = [];

    userDisconnectSystem: any;
    deletingSystem: any;
    currentlyMerging = false;
    debugMode: boolean;
    betaMode: boolean;
    settings: Settings;
    settingsSubscription: Subscription;
    settingsServiceSubscription: Subscription;
    systemSubscription: Subscription;

    settingsForSystem: any;

    private setupDefaults() {
        this.debugMode = this.CONFIG.clientMode.debug;
        this.betaMode = this.CONFIG.clientMode.beta;
        this.menuService.setSection('admin');
    }

    private updateSettings(forceMergeState?: boolean) {
        const merging = this.system && typeof this.system.mergeInfo !== 'undefined' || forceMergeState;
        const available = this.system && (!this.system.isOnline || !this.system.isAvailable);
        this.settings = {
            disconnectDisabled : merging,
            mergeDisabled      : (merging || available) && !(this.debugMode || this.betaMode),
            renameDisabled     : merging && this.system.mergeInfo && this.system.mergeInfo.role !== 'master',
            showMerge          : this.system && this.system.isMine && this.systemsService.systems.length > 1
        };
    }

    constructor(
        configService: NxConfigService,
        language: NxLanguageProviderService,
        private accountService: NxAccountService,
        private processService: NxProcessService,
        private pageService: NxPageService,
        private dialogs: NxDialogsService,
        private systemsService: NxSystemsService,
        private settingsService: NxSettingsService,
        private menuService: NxMenuService,
        private router: Router,
        private cloudApiService: NxCloudApiService
    ) {
        this.CONFIG = configService.getConfig();
        this.LANG = language.getTranslations();

        this.setupDefaults();
    }

    ngOnDestroy() {}

    ngOnInit(): void {
        this.settings = {
            disconnectDisabled : false,
            mergeDisabled      : true,
            renameDisabled     : false,
            showMerge          : true
        };

        if (this.settingsServiceSubscription) {
            this.settingsServiceSubscription.unsubscribe();
        }
        this.settingsServiceSubscription = this.settingsService
            .systemSubject
            .pipe(filter((system) => system !== undefined))
            .subscribe((system) => {
                this.system = system;
                this.pageService.setPageTitle(this.LANG.pageTitles.systemName.replace('{{systemName}}', this.system.info.name));
                if (this.system.isAvailable) {
                    if (this.systemSubscription) {
                        this.systemSubscription.unsubscribe();
                    }
                    this.systemSubscription = system.infoSubject
                        .pipe(throttleTime(this.CONFIG.system.throttleTime))
                        .subscribe(() => {
                            this.settingsService.footerSubject.next(true);
                            if (this.settingsSubscription) {
                                this.settingsSubscription.unsubscribe();
                            }
                            this.settingsSubscription = this.system.updateOrGetSystemSettings()
                                .subscribe((res: any) => {
                                    this.settingsForSystem = res.reply.settings;
                                    this.updatePeerSystems();
                                });
                        });
                }
                this.deletingSystem = this.processService.createProcess(
                    () => this.system.deleteFromCurrentAccount(),
                    {
                        successMessage : this.LANG.toastMessage.system.deleted.success.replace('{{systemName}}', this.system.info.name),
                        errorPrefix    : this.LANG.errorCodes.cantUnshareWithMeSystemPrefix
                    }
                ).then(
                    () => { this.updateAndGoToSystems(); },
                    error => error
                );
            });
    }

    disconnect() {
        if (this.system.isMine) {
            this.cloudApiService.getCloudStorageUsage(this.system.id).then(() => {
                // Display systemDisconnectError when attempting to disconnect system with cloud storage enabled
                const { dialogs: { cloudStorage:{ systemDisconnectError: { title, message } }, buttons: { ok } } } = this.LANG;
                this.dialogs.confirm(message, title, ok);
            }).catch(() => {
                // User is the owner. Deleting system means unbinding it and disconnecting all accounts
                // dialogs.confirm(this.LANG.system.confirmDisconnect, this.LANG.system.confirmDisconnectTitle, this.LANG.system.confirmDisconnectAction, 'danger').
                this.dialogs.disconnect(this.system.id)
                    .then((result) => {
                        if (result) {
                            this.updateAndGoToSystems();
                        }
                    });
            });
        }
    }

    updateAndGoToSystems() {
        this.userDisconnectSystem = true;
        this.systemsService
            .forceUpdateSystems(this.accountService.email)
            .subscribe(() => {
                setTimeout(() => {
                    this.router
                        .navigate([this.CONFIG.redirect.authorised])
                        .catch(error => {
                            console.error(error);
                        });
                });
            });
    }

    updatePeerSystems() {
        return this.system.getPeerSystems().toPromise()
            .then(res => {
                this.peerSystems = res.reply
                    .filter(peer => !peer.cloudSystemId)
                    .map(peer => {
                        const isNew = peer.serverFlags.includes(this.CONFIG.system.flags.newSystem);
                        const system: any = {
                            ...peer,
                            id         : peer.id.replace(/[{}]/g, ''),
                            url        : `${peer.remoteAddresses[0]}:${peer.port}`,
                            systemName : isNew ? this.LANG.dialogs.merge.newSystemDisplayName : peer.systemName,
                            ip         : peer.remoteAddresses[0],
                            name       : peer.name,
                            isNew
                        };
                        if (this.system && this.system.moduleInfo && peer.status === 'Incompatible') {
                            system.olderProtocol = peer.protoVersion < this.system.moduleInfo.protoVersion;
                        }
                        return system;
                    });
                this.updateSettings(this.currentlyMerging);
            });
    }

    delete() {
        if (!this.system.isMine) {
            // User is not owner. Deleting means he'll lose access to it
            this.dialogs.confirm(
                this.LANG.dialogs.removeSystem.message,
                this.LANG.dialogs.removeSystem.title,
                this.LANG.dialogs.removeSystem.action,
                'btn-danger',
                this.LANG.dialogs.buttons.cancel
            )
                .then((result) => {
                    if (result) {
                        return this.deletingSystem.run();
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
                this.systemsService.forceUpdateSystems(this.accountService.email);
            });
    }

    mergeSystems() {
        this.systems = this.systemsService.getMySystems(this.accountService.email, this.system.id);
        this.currentlyMerging = true;
        this.updateSettings(this.currentlyMerging);
        this.settingsService.system = this.system;
        return this.dialogs
            .merge(this.system, this.systems, this.peerSystems, this.accountService)
            .then((mergeInfo) => {
                if (mergeInfo) {
                    this.system.mergeInfo = mergeInfo;
                    const systemId = mergeInfo.role === 'master' ? this.system.id : mergeInfo.anotherSystemId;
                    this.systemsService.addToMergeList(systemId);
                    this.systemsService.processMerge(mergeInfo);
                    this.system.systemInfo = this.system;
                }
            }, (error) => {
                if (!error.primarySystemName && !error.secondarySystemName) {
                    return;
                }
                const commonErrorMsg = this.LANG.dialogs.merge.commonText
                    .replace('{{primarySystem}}', error.primarySystemName)
                    .replace('{{secondarySystem}}', error.secondarySystemName);
                let responseError = this.LANG.errorCodes[error.errorText] || this.LANG.errorCodes[error.resultCode];
                if (!responseError) {
                    responseError = this.LANG.errorCodes.unknownMergeError;
                } else {
                    responseError = responseError.replace('{{failedSystem}}', error.failedSystemName);
                }

                // HTML needed for section formatting
                const dialogBody = '<p>' + commonErrorMsg + '</p><p>' + responseError + '</p>';

                // Handling promise to satisfy the linter.
                this.dialogs.confirm(
                    dialogBody,
                    this.LANG.dialogs.merge.mergeFailedTitle,
                    this.LANG.dialogs.buttons.ok,
                    'btn-primary',
                    undefined).then(() => {});
            }).finally(() => {
                this.currentlyMerging = false;
                this.updateSettings(this.currentlyMerging);
                this.settingsService.system = this.system;
            });
    }

    updateUserRole() {
        let userRole = this.system.accessRole;
        if (this.system.accessRole in this.LANG.accessRoles) {
            userRole = this.LANG.accessRoles[this.system.accessRole].label;
        }
        return userRole;
    }
}
