import { HttpClient } from '@angular/common/http';
import {
    Component, Input, ViewChild,
    ChangeDetectorRef, ElementRef, Inject
} from '@angular/core';
import { cloneDeep } from 'lodash-es';

import { LanguageI18NStaticTypes } from '@common/language/language_i18n_static_types';
import type {
    DropdownItem,
} from '@components/dropdowns/generic/dropdown.component.types';
import { NxRibbonService } from '@components/ribbon/ribbon.service';
import { DIALOG_DATA, DialogRef } from '@dialogs/dialog-ref';
import { NxSimpleDialogsService } from '@dialogs/simple-dialogs.service';
import { environment } from '@environments/environment';
import { NxAccountService } from '@services/account.service';
import { NxLoginService } from '@services/login.service';
import { NxCloudApiService } from '@services/nx-cloud-api';
import type { IConfig } from '@services/nx-config/config-types';
import { NxConfigService } from '@services/nx-config/nx-config.service';
import { NxLanguageProviderService } from '@services/nx-language-provider';
import { NxProcessService } from '@services/process.service';
import { Process } from '@services/process.service/process';
import { ModuleInformation } from '@services/system-api.types';
import { NxSystemService } from '@services/system.service/system.service';
import { NxSystemsService } from '@services/systems.service';
import { NxSystemInfo } from '@services/systems.service.types';
import { WINDOW } from '@services/window-provider';
import { cleanIp, htmlToEntity, strSplice, pickFrom } from '@utils/general';

import { State } from './stateForMergeDialog';
import { StateMachine } from './stateMachine';

interface SystemDropdownItem extends DropdownItem<string> {
    peer?: boolean;
}

interface NxSystemModuleInfo extends NxSystemInfo {
    moduleInfo?: any;
    protoVersion?: string;
}

@Component({
    selector: 'nx-modal-merge-content',
    templateUrl: 'merge.component.html',
    styleUrls: ['merge.component.scss']
})
export class MergeModalContent {
    @Input() closable = true;

    LANG: LanguageI18NStaticTypes;
    CONFIG: IConfig;

    readonly environment = environment;

    user;
    system;
    systems: NxSystemInfo[];
    systemsWithInfo: NxSystemModuleInfo[];
    account: NxAccountService;
    checkMergeabilityFunction;
    checkMergeabilityProcess: Process;
    checkPasswordProcess: Process;
    mergingProcess: Process;
    primarySystem;
    peerSystems = [];
    processedSystems: SystemDropdownItem[] = [];
    secondarySystem;
    serverUrl: string;
    cleanUrl: string;
    serverUrlInputExists: boolean;
    systemMergeable: string;
    targetSystem;
    targetSystemDropdown: SystemDropdownItem;
    targetSystemService;
    tooManyServers: boolean;
    nonCloudMerge = false;
    systemsLoaded = false;
    checking = false;
    dryRunAvailable = false;
    systemUpdating = false;
    primaryName: string;
    secondaryName: string;
    systemUrls = {};
    updateSession = false;
    wrongPassword = false;
    private remotePassword: string;

    // static variables
    readonly checkMerge: string = 'checkMerge';
    readonly checkMergeDefault: string = 'checkMergeDefault';
    readonly checkMergeError: string = 'checkMergeError';
    readonly serverUrlState: string = 'serverUrl';
    readonly serverUrlMergeError: string = 'serverUrlMergeError';
    readonly confirmPasswordError: string = 'confirmPasswordError';
    readonly serverUrlErrors: string = 'serverUrlErrors';
    readonly confirmMerge: string = 'confirmMerge';

    readonly knownBothSystemsConnectedToCloud: string = 'knownBothSystemsConnectedToCloud';
    readonly unknownBothSystemsConnectedToCloud: string = 'unknownBothSystemsConnectedToCloud';
    readonly differentOwners: string = 'differentOwners';
    readonly duplicateServers: string = 'duplicateServers';
    readonly noServerFound: string = 'noServerFound';
    readonly otherSystem: string = 'otherSystem';
    readonly passwordRequired: string = 'passwordRequired';
    readonly passwordWrong: string = 'passwordWrong';
    readonly secondarySystemUnavailable: string = 'secondarySystemUnavailable';
    readonly serverNotAvailable: string = 'serverNotAvailable';
    readonly systemOffline: string = 'systemOffline';
    readonly systemOfflineUrl: string = 'systemOfflineUrl';
    readonly targetSystemBoundToCloud: string = 'targetSystemBoundToCloud';
    readonly unknownError: string = 'unknownError';
    readonly wrongLogin: string = 'Wrong username or password.';

    machine: StateMachine;

    @ViewChild('checkMergeDropdown') mergeDropdown: any;
    @ViewChild('serverUrlInput') serverUrlInput: any;
    @ViewChild('checkMergeUrlInput') serverUrlInputFocus: ElementRef;
    @ViewChild('adminPasswordForm') adminPassword: HTMLFormElement;
    @ViewChild('adminPasswordInput') adminPasswordInput: ElementRef;
    @ViewChild('primaryRadio') primaryRadio: any;
    @ViewChild('confirmMergeForm') confirmMergeForm: HTMLFormElement;
    @ViewChild('confirmMergeInput') confirmMergeInput: ElementRef;

    constructor(
        configService: NxConfigService,
        languageService: NxLanguageProviderService,
        private httpService: HttpClient,
        private cloudApi: NxCloudApiService,
        private cdRef: ChangeDetectorRef,
        private loginService: NxLoginService,
        private processService: NxProcessService,
        private simpleDialogService: NxSimpleDialogsService,
        private systemService: NxSystemService,
        private systemsService: NxSystemsService,
        private ribbonService: NxRibbonService,
        public dialogRef: DialogRef,
        @Inject(DIALOG_DATA) private dialogData: any,
        @Inject(WINDOW) private window: Window,
    ) {
        this.CONFIG = configService.getConfig();
        this.LANG = languageService.translations;
    }

    private getSystemInfo(systemId: string): Promise<ModuleInformation> {
        const url = `https://${this.CONFIG.trafficRelayHost.replace('{systemId}', systemId)}/api/moduleInformation`;
        return this.httpService.get<ModuleInformation>(url).toPromise();
    }

    ngOnInit(): void {
        pickFrom(this.dialogData, ['system', 'systems', 'user'], this);

        this.machine = new StateMachine(this.checkMerge, State);
        this.init();
    }

    async init(targetSystem?, currentUrl?): Promise<void> {
        this.dryRunAvailable = this.system.info.capabilities.merge_systems >= 1;
        if (this.system.canMerge) {
            this.setPrimarySystem(this.system);
            this.updateShow(this.checkMergeDefault);
            await this.system.serverManager.getModuleInfo().toPromise();
            environment.isLocal && await this.getPeerSystems();
            this.account = await this.user.get();
            this.systemsWithInfo = await Promise.all(
                this.systems.map(async (system: NxSystemInfo) => {
                    const newSystem: NxSystemModuleInfo = { ...system, status: '', protoVersion: '', moduleInfo: undefined };
                    if (!newSystem.moduleInfo && !['offline', 'unavailable'].includes(newSystem.stateOfHealth)) {
                        try {
                            newSystem.moduleInfo = (await this.getSystemInfo(system.id)).reply;
                            newSystem.protoVersion = newSystem.moduleInfo.protoVersion;
                        } catch (err) {
                            console.error(err);
                            newSystem.status = 'offline';
                            newSystem.stateOfHealth = 'offline';
                        }
                    }
                    return newSystem;
                })
            );

            if (this.systemsWithInfo.length === 0 && this.peerSystems.length === 0) {
                if (environment.isLocal) {
                    this.targetSystem = { value: this.otherSystem, name: this.LANG.dialogs.merge.otherSystem?.() };
                    this.secondarySystem = this.targetSystem;
                    this.updateShow('noOtherSystemServerUrl');
                } else {
                    this.machine.transition('failedToFindAnySystem');
                }
            } else {
                if (this.systemsWithInfo.length) {
                    this.processedSystems.push(
                        ...this.makeSelectorList(this.systemsWithInfo)
                    );
                }
                if (environment.isLocal) {
                    if (this.peerSystems.length) {
                        this.processedSystems.push(
                            { name: 'horizontal', value: undefined },
                            ...this.makeSelectorList(this.peerSystems),
                        );
                    }
                    this.processedSystems.push(
                        { name: 'horizontal', value: undefined },
                        { value: this.otherSystem, name: this.LANG.dialogs.merge.otherSystem?.() }
                    );
                }
                if (targetSystem) {
                    this.systemsService.forceUpdateSystems();
                    const systemsSubscription = this.systemsService.systemsSubject.subscribe(systems => {
                        this.systemsWithInfo = systems as NxSystemModuleInfo[] || [];
                        const updatedTargetSystem = [...this.systems, ...this.peerSystems]
                            .find(system => system.id === targetSystem.id);
                        if (updatedTargetSystem) {
                            updatedTargetSystem.value = updatedTargetSystem.id;
                        }
                        this.systemMergeable = this.checkMergeability(updatedTargetSystem || targetSystem);
                        this.updateShow('', { helpText: this.LANG.dialogs.merge.ownerCanMergeText?.() });
                        this.setTargetSystem(updatedTargetSystem || targetSystem, currentUrl);
                    });
                    systemsSubscription.unsubscribe();
                } else {
                    this.targetSystem = this.selectDefaultSystem();
                    this.secondarySystem = this.targetSystem;
                    this.getSecondaryName();
                    this.targetSystemDropdown = this.makeSelectorList([this.targetSystem])[0];
                    this.systemMergeable = this.checkMergeability(this.targetSystem);
                    if (this.systemMergeable) {
                        this.updateShow(
                            this.checkMergeError,
                            { checkingErrorText: this.systemMergeable }
                        );
                    } else {
                        let show = this.checkMergeDefault;
                        const templateUpdates: any = {
                            helpText: this.LANG.dialogs.merge.ownerCanMergeText?.(),
                            selectedTarget: this.targetSystemDropdown.value
                        };
                        if (this.targetSystemDropdown.peer) {
                            show = this.serverUrlState;
                            templateUpdates.serverUrlInputValue = currentUrl || this.targetSystem.url;
                            delete templateUpdates.helpText;
                        }
                        this.updateShow(show, templateUpdates);
                    }
                }
            }
            this.systemsLoaded = true;
            this.systemUpdating = false;
            this.mergeDropdown.dropdownToggleButton.nativeElement.focus();
            this.initProcesses();
        } else {
            this.machine.transition('thisSystemHasOutdatedServerError');
        }
    }

    updateShow(newShow?, templateVariable: any = {}): void {
        const { showUpdates, show, template } = this.machine.state;
        if (newShow) {
            if (newShow.includes('Error')) {
                this.insertErrorMessages();
            }
            Object.keys(show).forEach(e => {
                show[e] = !!showUpdates[newShow][e];
            });
            if (this.machine.currentState === this.checkMerge) {
                const newBodyTitle = newShow.includes('noOtherSystem')
                    ? this.LANG.dialogs.merge.enterSystemAddressTitle?.()
                    : this.LANG.dialogs.merge.mergeSystemsTitle?.();
                if (newBodyTitle !== template.bodyTitle) {
                    templateVariable.bodyTitle = newBodyTitle;
                }
                // clears serverUrl if going back to a checkMerge state
                if (
                    newShow.includes('checkMerge') &&
                    // skips when in "checking" state
                    templateVariable.helpText !== this.LANG.dialogs.merge.checking?.() &&
                    template.serverUrlInputValue
                ) {
                    template.serverUrlInputValue = '';
                }
            }
        }

        if (Object.keys(templateVariable).length > 0) {
            for (const update in templateVariable) {
                if (update in template) {
                    template[update] = update.includes('Error')
                        ? this.machine.state.errorText[templateVariable[update]]
                        : templateVariable[update];
                }
            }
        } else {
            ['serverUrlInputValidationErrorText', 'checkingErrorText', 'passwordErrorText']
                .forEach(clearText => {
                    template[clearText] = '';
                });
        }
    }

    setTargetSystem(targetSystem, serverUrlInputValue = ''): void {
        // cancels process service if new system selected while checking
        if (this.checkMergeabilityProcess.processing && !this.systemUpdating) {
            this.checkMergeabilityProcess.processing = false;
            this.checkMergeabilityProcess.finished = true;
            this.checking = false;
            this.setTargetSystem(targetSystem, serverUrlInputValue);
        } else {
            let showUpdate = this.checkMergeDefault;
            const templateUpdates: any = {};
            if (targetSystem.value === this.otherSystem) {
                this.targetSystemDropdown = { value: this.otherSystem, name: this.LANG.dialogs.merge.otherSystem?.() };
                this.targetSystem = targetSystem;
                showUpdate = this.serverUrlState;
                Object.assign(templateUpdates, { serverUrlInputValue, selectedTarget: this.otherSystem });
            } else {
                this.targetSystem = this.systemsWithInfo.find(system => system.id === targetSystem.value) ||
                    this.peerSystems.find(system => system.id === targetSystem.value);
                this.targetSystem.value = this.targetSystem.id;
                this.targetSystemDropdown = this.makeSelectorList([this.targetSystem])[0];
                this.systemMergeable = this.checkMergeability(this.targetSystem);
                Object.assign(templateUpdates, {
                    helpText: this.LANG.dialogs.merge.ownerCanMergeText?.(),
                    selectedTarget: this.targetSystem.value
                });

                if (this.targetSystem.systemName) {
                    showUpdate = this.serverUrlState;
                    templateUpdates.serverUrlInputValue = this.targetSystem.url;
                    delete templateUpdates.helpText;
                }
                if (this.systemMergeable) {
                    showUpdate = this.targetSystem.systemName ? this.serverUrlMergeError : this.checkMergeError;
                    templateUpdates.checkingErrorText = this.systemMergeable;
                    delete templateUpdates.helpText;
                }
            }
            this.setSystems();
            this.updateShow(showUpdate, templateUpdates);
            setTimeout(() => {
                if (this.machine.state.show.serverUrlInput) {
                    this.serverUrlInputFocus.nativeElement.focus();
                }
            });
        }
    }

    getPeerSystems() {
        return this.system.getPeerSystems().toPromise()
            .then((res: any) => {
                this.peerSystems = res.reply
                    .filter(peer => this.environment.isLocal ? this.system.id !== peer.localSystemId : !peer.cloudSystemId)
                    .map(peer => {
                        if (peer.remoteAddresses) {
                            peer.remoteAddresses.forEach((addy: string) => {
                                const ip = cleanIp(addy);
                                this.systemUrls[`${ip}:${peer.port}`] = peer.id.replace(/{|}/g, '');
                            });
                        }
                        const isNew = peer.serverFlags.includes(this.CONFIG.system.flags.newSystem);
                        const ip = cleanIp(peer.remoteAddresses[0]);
                        const system: any = {
                            ...peer,
                            id: peer.id.replace(/[{}]/g, ''),
                            url: `${ip}:${peer.port}`,
                            systemName: isNew ? this.LANG.dialogs.merge.newSystemDisplayName() : peer.systemName,
                            name: peer.systemName || peer.name,
                            discoveredPeer: true,
                            ip,
                            isNew
                        };
                        if (this.system && this.system.moduleInfo && peer.status === 'Incompatible') {
                            system.olderProtocol = peer.protoVersion < this.system.moduleInfo.protoVersion;
                        }
                        return system;
                    })
                    .sort((sysA, sysB) => {
                        const a = `${sysA.systemName?.toLowerCase?.()}${sysA.name.toLowerCase()}`;
                        const b = `${sysB.systemName?.toLowerCase?.()}${sysB.name.toLowerCase()}`;
                        return a < b ? -1 : 1;
                    });
            });
    }

    checkIfExistingSystem(url: string): void {
        // if using otherSystem, checks if it matches an existing system in dropdown
        if (url && (/^https?:\/\//).test(url)) {
            url = url.slice(url.indexOf('://') + 3);
        }
        if (url && !(/:\d{1,5}$/).test(url)) {
            url += ':7001';
        }
        if (this.targetSystem.value === this.otherSystem && this.systemUrls[url]) {
            const targetSystem = this.systemsWithInfo.find(system => system.id === this.systemUrls[url]) ||
                this.peerSystems.find(system => system.id === this.systemUrls[url]);
            targetSystem.value = targetSystem.id;
            this.setTargetSystem(targetSystem, url);
        }
    }

    private handleOldSession(process): void {
        this.updateSession = true;
        this.loginService.currentSystem = this.system;
        this.loginService.updateSession('merge')
            .then(ready => {
                this.updateSession = !ready;
                if (ready) {
                    process.run();
                }
            });
    }

    initProcesses(): void {
        this.checkMergeabilityFunction = () => {
            this.checkIfExistingSystem(this.machine.state.template.serverUrlInputValue);
            if (this.targetSystem.value === this.otherSystem) {
                this.serverUrlInput.control.markAsTouched();
                this.serverUrlChange(this.serverUrlInput);
            }
        };

        this.checkMergeabilityProcess = this.processService
            .createProcess(() => {
                this.checking = true;
                return this.preCheckSystemMerge();
            }, { ignoreError: true })
            .then(
                res => {
                    if (res !== 'canceled') {
                        this.checking = false;
                        // covers case where system (cloud & non-cloud) is not set up yet
                        if (res.isNew) {
                            if (this.serverUrl) {
                                const index = this.serverUrl.indexOf('//') + 2;
                                this.serverUrl = strSplice(
                                    this.serverUrl,
                                    index,
                                    'admin:admin@'
                                );
                            }
                            this.remotePassword = 'admin';
                            this.machine.transition(this.confirmMerge);
                        } else if (!Object.keys(res).length || res.error === '0' || !res.error) {
                            if (this.serverUrlInputExists) {
                                this.machine.transition('adminPassword');
                            } else {
                                this.setPrimarySystem(this.system);
                                this.setSystems();
                                this.machine.transition('choosePrimary');
                            }
                        }
                    }
                },
                err => {
                    if (err.errorId === this.CONFIG.servers.errors.oldSessionErrorId) {
                        return this.handleOldSession(this.checkMergeabilityProcess);
                    } else if (err.status === 403 || err.errorId === this.CONFIG.servers.errors.unauthorized) {
                        return this.simpleDialogService.expiredSession().then(() => this.window.location.reload());
                    }
                    if (err !== 'canceled') {
                        this.checking = false;
                        if (err.message === 'Timeout has occurred') {
                            err.message = this.noServerFound;
                        }
                        // Handling for rest errors.
                        if (err.errorString) {
                            if (err.errorString.includes(this.LANG.dialogs.merge.restError.duplicateServer())) {
                                err.message = this.duplicateServers;
                            } else if (err.errorString.includes(this.LANG.dialogs.merge.restError.useCloudMerge())) {
                                err.message = this.targetSystemBoundToCloud;
                            } else if (err.errorString.includes(this.LANG.dialogs.merge.restError.differentCloudOwners())) {
                                err.message = this.differentOwners;
                            }
                        }
                        const errorMessageExists = Object.prototype.hasOwnProperty.call(this.machine.state.errorText, err.message);
                        this.updateShow(
                            this.targetSystem.systemName || this.targetSystem.value === this.otherSystem ? this.serverUrlMergeError : this.checkMergeError,
                            { checkingErrorText: errorMessageExists ? err.message : this.unknownError }
                        );
                    }
                    this.serverUrlInputFocus ? this.serverUrlInputFocus.nativeElement.focus()
                        : this.mergeDropdown.dropdownToggleButton.nativeElement.focus();
                }
            );

        this.checkPasswordProcess = this.processService
            .createProcess(() => {
                // when trying again, does not have access to previous state template
                if (!this.environment.isLocal && this.machine.state.template.passwordValue) {
                    // for use case when password gets changed
                    if (this.serverUrl.includes('//admin:')) {
                        const startIndex = this.serverUrl.indexOf('//admin') + 2;
                        const endIndex = this.serverUrl.indexOf('@', startIndex + 1) + 1;
                        this.serverUrl = this.serverUrl.slice(0, startIndex) + this.serverUrl.slice(endIndex);
                    }
                    const index = this.serverUrl.indexOf('//') + 2;
                    this.serverUrl = strSplice(
                        this.serverUrl,
                        index,
                        `admin:${this.machine.state.template.passwordValue}@`
                    );
                }
                if (!this.dryRunAvailable) {
                    this.checkMergeabilityProcess.processing = false;
                    this.checkMergeabilityProcess.finished = true;
                    this.machine.transition(this.confirmMerge);
                    return Promise.resolve();
                } else {
                    return this.system.mergeSystems(
                        this.serverUrl,
                        this.targetSystem.id,
                        true,
                        this.machine.state.template.passwordValue
                    ).toPromise()
                        .catch(res => {
                            if (res.error && res.error.errorId === this.CONFIG.servers.errors.invalidParameter) {
                                this.updateShow(this.confirmPasswordError, {
                                    passwordErrorText: this.passwordWrong
                                });
                                this.wrongPassword = true;
                            }
                        });
                }
            },
            {
                ignoreError: true,
                errorCodes: { [this.wrongLogin]: 'potentialErrorString' }
            },
            res => {
                if (!res) {
                    return;
                }
                if (!res.error || res.error === '0') {
                    this.remotePassword = this.machine.state.template.passwordValue;
                    this.checkForChoosePrimary();
                    const { history } = this.machine;
                    if (history[history.length - 1] === this.serverUrlErrors) {
                        history.pop();
                    }
                } else if (res.errorString === 'UNAUTHORIZED') {
                    this.adminPassword.form.controls.adminPassword.setErrors({ passwordWrong: true });
                    this.updateShow(this.confirmPasswordError, {
                        passwordErrorText: this.passwordWrong,
                        passwordValue: ''
                    });
                    this.adminPasswordInput.nativeElement.focus();
                } else if (res.errorString) {
                    if (this.machine.currentState !== this.serverUrlErrors) {
                        this.machine.transition(this.serverUrlErrors);
                    }
                    const newCheckMergeErrors = {
                        CLOUD_SYSTEMS_HAVE_DIFFERENT_OWNERS: this.differentOwners,
                        DUPLICATE_MEDIASERVER_FOUND: this.duplicateServers,
                        FAIL: this.systemOfflineUrl
                    };
                    this.updateShow(this.serverUrlErrors, {
                        urlErrorText: newCheckMergeErrors[res.errorString] || this.serverNotAvailable
                    });
                }
            }, err => {
                if (err.errorString === this.wrongLogin) {
                    this.adminPassword.form.controls.adminPassword.setErrors({ passwordWrong: true });
                    this.updateShow(this.confirmPasswordError, {
                        passwordErrorText: this.passwordWrong,
                        passwordValue: ''
                    });
                    this.adminPasswordInput.nativeElement.focus();
                    return;
                }
                if (err.errorId === this.CONFIG.servers.errors.oldSessionErrorId) {
                    return this.handleOldSession(this.checkPasswordProcess);
                } else if (err.status === 403 || err.errorId === this.CONFIG.servers.errors.unauthorized) {
                    return this.simpleDialogService.expiredSession().then(() => this.window.location.reload());
                }
                console.error(err);
                if (this.machine.currentState !== this.serverUrlErrors) {
                    this.machine.transition(this.serverUrlErrors);
                }
                const urlErrorText = err.message === 'Timeout has occurred'
                    ? this.systemOfflineUrl : this.unknownError;
                this.updateShow(this.serverUrlErrors, { urlErrorText });
            });

        this.mergingProcess = this.processService
            .createProcess(() => {
                let password = this.machine.state.template.passwordValue;

                if (this.environment.isLocal) {
                    password = this.remotePassword;
                }
                if (!password && !this.system.mediaserver.isSessionOauth) {
                    return Promise.reject({ error: { data: { resultCode: 'missingPassword' } } });
                }

                if (this.nonCloudMerge || this.environment.isLocal) {
                    const takeRemoteSettings = this.system.id === this.secondarySystem.id;
                    const bothAreCloud = this.primarySystem?.mediaserver?.isSessionOauth && !!this.secondarySystem?.cloudSystemId ||
                        this.secondarySystem?.mediaserver?.isSessionOauth && !!this.primarySystem?.cloudSystemId;
                    return this.dryRunAvailable
                        ? this.system.mergeSystems(this.serverUrl, bothAreCloud ? '' : this.targetSystem.id, false, password, takeRemoteSettings).toPromise()
                        : this.deprecatedMergeSystems(password, takeRemoteSettings);
                } else {
                    return this.cloudApi.merge(this.primarySystem.id, this.secondarySystem.id, password);
                }
            }, {
                errorCodes: {
                    mergedSystemIsOffline: () => {
                        return this.LANG.toastMessage.system.merge.failed?.();
                    },
                    vmsRequestFailure: () => {
                        return this.LANG.toastMessage.system.merge.failed?.();
                    },
                    missingPassword: () => {
                        this.updateShow(this.confirmPasswordError, { passwordErrorText: this.passwordRequired });
                        this.confirmMergeInput?.nativeElement.focus();
                    },
                    wrongPassword: () => {
                        this.updateShow(this.confirmPasswordError, { passwordErrorText: this.passwordWrong, passwordValue: '' });
                        this.confirmMergeInput?.nativeElement.focus();
                    },
                    [this.wrongLogin]: 'potentialErrorString'
                },
                ignoreError: true
            })
            .then(res => {
                if (res.mergeInProgress || res.error === '0' || res.resultCode === this.LANG.errorCodes.ok?.()) {
                    // handles telling the app which systems are getting merged and the proper messaging
                    if (this.environment.isLocal) {
                        const template =
                            `<div class="my-1">
                            <div class="larger"><strong>${this.secondarySystem.name}</strong> ${this.LANG.ribbon.beingMerged.to()}</div>
                            <div class="mt-2">${this.LANG.ribbon.beingMerged.mayTake()}</div>
                        </div>`;
                        this.ribbonService.hide();
                        this.ribbonService.show(template, [], 'alert');
                    } else {
                        this.systemsService.forceUpdateSystems();
                    }
                    this.close({
                        secondary: {
                            id: this.secondarySystem.id,
                            name: this.secondaryName
                        },
                        primary: {
                            id: this.primarySystem.id,
                            name: this.primaryName
                        },
                        anotherSystemId: this.targetSystem.id,
                        role: this.primarySystem.id === this.system.id
                            ? this.CONFIG.system.status.master
                            : this.CONFIG.system.status.slave
                    });
                    // wrong cloud password
                } else if (res.errorString === this.wrongLogin) {
                    this.confirmMergeForm.form.controls.cloudOwnerPassword.setErrors({ passwordWrong: true });
                    this.updateShow(this.confirmPasswordError, { passwordErrorText: this.passwordWrong });
                    this.confirmMergeInput.nativeElement.focus();
                    // wrong local admin password when checking VMS <= 4.0 systems
                } else if (res.errorString === 'UNAUTHORIZED') {
                    this.confirmMergeForm.form.controls.cloudOwnerPassword.setErrors({ passwordWrong: true });
                    this.updateShow(this.confirmPasswordError, { passwordErrorText: 'adminPasswordWrong' });
                    this.confirmMergeInput.nativeElement.focus();
                } else if (res.errorString) {
                    res.resultCode = res.errorString.toLowerCase();
                    this.handleMergeError(res);
                }
            }, error => {
                if (error.errorString === this.wrongLogin) {
                    this.confirmMergeForm.form.controls.cloudOwnerPassword.setErrors({ passwordWrong: true });
                    this.updateShow(this.confirmPasswordError, { passwordErrorText: this.passwordWrong });
                    this.confirmMergeInput.nativeElement.focus();
                    return;
                }
                if (error.errorId === this.CONFIG.servers.errors.oldSessionErrorId || error.resultCode === 'vmsRequestFailure') {
                    return this.handleOldSession(this.mergingProcess);
                } else if (error.status === 403 || error.errorId === this.CONFIG.servers.errors.unauthorized) {
                    return this.simpleDialogService.expiredSession().then(() => this.window.location.reload());
                }
                // for errors that pop up during the merge
                let errorCode = error.resultCode || (error.data?.resultCode);
                if (errorCode === 'missingPassword' || errorCode === 'wrongPassword') {
                    return;
                }
                if (!errorCode && error.name === 'TimeoutError') {
                    errorCode = 'fail';
                }

                /** Get the names of the primary and secondary system.
                    Next try to figure out which system caused the problem.
                    If the primary system's stateOfHealth is not online set it as the failedSystem.
                    Otherwise the secondary system is set as the failedSystem no matter what.
                */
                error.resultCode = errorCode;
                this.handleMergeError(error);
            });
    }

    checkForChoosePrimary(): void {
        const primary = this.system.moduleInfo;
        const secondary = this.targetSystem.moduleInfo || this.targetSystem;
        if (!!primary.cloudSystemId !== !!secondary.cloudSystemId) {
            if (secondary.cloudSystemId) {
                this.primarySystem = this.targetSystem;
                this.setSystems();
            }
            this.machine.transition(this.confirmMerge);
        } else if (primary.cloudOwnerId !== secondary.cloudOwnerId) {
            this.machine.transition(this.serverUrlErrors);
            this.updateShow(this.serverUrlErrors, { urlErrorText: this.differentOwners });
        } else {
            this.machine.transition('choosePrimary');
        }
    }

    handleMergeError(error): void {
        const err = error.data ? cloneDeep(error.data) : {};
        err.resultCode = error && error.resultCode || '';
        err.errorText = (error && error.errorText) || '';

        err.primarySystemName = this.primaryName;
        err.secondarySystemName = this.secondaryName;

        this.systemsService.forceUpdateSystems().toPromise()
            .then(systems => {
                this.systemsWithInfo = systems as NxSystemModuleInfo[];
            })
            .finally(() => {
                const system = this.systemsWithInfo.find(system => system.id === this.primarySystem.id);
                const stateOfHealth = system?.stateOfHealth || this.primarySystem.stateOfHealth;
                err.failedSystemName = stateOfHealth === 'online'
                    ? err.secondarySystemName
                    : err.primarySystemName;

                const { errorText } = error;
                if (err.resultCode === 'vmsRequestFailure' && ['FAIL', 'CONFIGURATION_ERROR', 'Service Unavailable', 'Bad Gateway'].includes(errorText)) {
                    err.errorText = errorText === 'Bad Gateway' ? 'systemUnavailable' : 'mergedSystemIsOffline';
                }

                this.close(err);
                this.clearTemplate();
            });
    }

    deprecatedMergeSystems(password: string, takeRemoteSettings = false) {
        const adminPassword = this.serverUrl.slice(this.serverUrl.indexOf('//admin') + 8, this.serverUrl.lastIndexOf('@'));
        return this.system.mediaserver.deprecatedMergeSystems(this.serverUrl, password, adminPassword, takeRemoteSettings);
    }

    async preCheckSystemMerge() {
        const isNew = { isNew: true };
        this.getSecondaryName();
        this.serverUrlInputExists = Boolean(this.machine.state.template.serverUrlInputValue);
        if (this.serverUrlInputExists) {
            this.serverUrl = this.machine.state.template.serverUrlInputValue;
            if (!(/^https?:\/\//).test(this.serverUrl)) {
                this.serverUrl = `${this.window.location.protocol}//${this.serverUrl}`;
            }
            if (!(/:\d{1,5}$/).test(this.serverUrl)) {
                this.serverUrl += ':7001';
            }
            this.cleanUrl = this.serverUrl;
            this.getSecondaryName();
            this.nonCloudMerge = true;
            if (!this.dryRunAvailable) {
                this.systemUpdating = true;
                await this.system.update();
                this.systemsLoaded = false;
                this.processedSystems = [];
                await this.init(this.targetSystem, this.machine.state.template.serverUrlInputValue);
                // means dryRun is still not available after primary system update
                if (this.system.info.capabilities.merge_systems >= 1) {
                    const res = await this.preCheckSystemMerge();
                    return res;
                }
                return this.systemMergeable ? 'canceled' : { error: '0' }; // systemMergeable === '' = mergeable
            }
        } else {
            this.updateShow(this.checkMergeDefault, { helpText: this.LANG.dialogs.merge.checking?.() });
        }

        /**
         * targetSystem
         * no id = Other System
         * localSystemId = auto-discovered system
         * else = cloud-connected merge check
         */
        if (this.environment.isLocal && this.targetSystem.cloudOwnerId && this.system.moduleInfo.cloudOwnerId) {
            if (this.targetSystem?.name) {
                throw Error(this.knownBothSystemsConnectedToCloud);
            }
            throw Error(this.unknownBothSystemsConnectedToCloud);
        }
        if (!this.targetSystem.id || this.targetSystem.localSystemId) {
            if (!this.targetSystem.id) {
                let secondarySystem: any;
                if (this.system.useRest) {
                    secondarySystem = await this.system.getRemoteServerInfo(this.serverUrl).toPromise();
                } else {
                    secondarySystem = (await this.system.getModuleInfoUsingUrl(this.serverUrl).toPromise()).reply;
                    if (secondarySystem) {
                        secondarySystem.isNew = secondarySystem.serverFlags.includes('SF_NewSystem');
                    }
                }
                if (secondarySystem?.id) {
                    this.targetSystem = secondarySystem;
                    this.setSystems();
                }
            }
            return this.system.mergeSystems(this.serverUrl, this.targetSystem.id, true).toPromise()
                .then(res => {
                    if (res.error && res.error !== '0') {
                        switch (res.errorString) {
                            case 'FAIL':
                                throw Error(this.noServerFound);
                            case 'INCOMPATIBLE':
                                throw Error('systemsIncompatible');
                            case 'DUPLICATE_MEDIASERVER_FOUND':
                                throw Error(this.duplicateServers);
                            default:
                                throw Error(this.unknownError);
                        }
                    }
                    return this.targetSystem.isNew ? isNew : res;
                });
        } else {
            this.targetSystemService = this.systemService.createSystem(this.account.email, this.targetSystem.id, undefined, true, true);
            let targetSystem;
            try {
                targetSystem = await this.targetSystemService.getInfo(true, false);
            } catch (err) {
                throw Error(this.systemOffline);
            }
            await this.targetSystemService.getUsers(true, true);
            if (!targetSystem.isOnline) {
                throw Error(this.systemOffline);
            } else if (!targetSystem.isAvailable) {
                throw Error(this.secondarySystemUnavailable);
            }

            let mainSystemProto, targetSystemProto;
            try {
                const [mainSystem, targetSystem] = await Promise.all([
                    this.system.serverManager.getModuleInfo().toPromise(),
                    this.targetSystemService.serverManager.getModuleInfo().toPromise()
                ]);
                mainSystemProto = mainSystem.reply.protoVersion;
                targetSystemProto = targetSystem.reply.protoVersion;
            } catch (err) {
                if (err.status === 502) {
                    throw Error(this.systemOffline);
                }
            }

            if (mainSystemProto === targetSystemProto) {
                const [mainServers, targetServers] = await Promise.all([
                    this.system.mediaserver.getMediaServers(false).toPromise(),
                    this.targetSystemService.mediaserver.getMediaServers(false).toPromise()
                ]);
                const primaryServerIds: Set<string> = mainServers.reduce((list, { id }) => list.add(id), new Set<string>());
                if (targetServers.some(server => primaryServerIds.has(server.id))) {
                    throw Error(this.duplicateServers);
                }
                this.tooManyServers = mainServers.length + targetServers.length > this.CONFIG.maxServers;
            } else {
                throw Error(`systemVersion${mainSystemProto < targetSystemProto ? 'New' : 'Old'}`);
            }
            this.targetSystemService.stopPoll();
        }
        return this.targetSystem.isNew ? isNew : { error: '0' };
    }

    goBack(): void {
        this.confirmMergeForm && this.confirmMergeForm.form.markAsUntouched();
        this.adminPassword && this.adminPassword.form.markAsUntouched();
        this.machine.goBack();
        this.cdRef.detectChanges();
        this.mergeDropdown && this.mergeDropdown.dropdownToggleButton.nativeElement.focus();
        this.primaryRadio && this.primaryRadio.inputRadio.nativeElement.focus();

        if (this.machine.currentState === this.checkMerge) {
            this.systemsLoaded = false;
            this.processedSystems = [];
            this.init(this.targetSystem, this.machine.state.template.serverUrlInputValue);
        }
    }

    insertErrorMessages(): void {
        const { errorText } = this.machine.state;
        for (const error in errorText) {
            if (Object.prototype.hasOwnProperty.call(errorText, error)) {
                let downloadHTML = `<span>${this.LANG.dialogs.merge.latestBuild?.()}</span>`;
                if (this.CONFIG.cloudHost) {
                    downloadHTML = `<a href=\"${this.environment.isLocal ? this.CONFIG.cloudHost : ''}/download" target=\"_blank\">${this.LANG.dialogs.merge.latestBuild?.()}</a>`;
                }
                const parsedError = ['systemVersionOld', 'systemVersionNew', 'systemsIncompatible'].includes(error)
                    ? this.targetSystem.discoveredPeer ? 'systemsIncompatible' : 'systemVersionsNotMatch'
                    : error;
                errorText[error] = this.LANG.dialogs.merge[parsedError]({
                    primarySystem: this.primaryName,
                    targetSystem: this.secondaryName,
                    secondarySystem: this.secondaryName,
                    downloadHTML
                });
            }
        }
    }

    getStatus(system): [name: string, status: string] {
        const statusIncompatible = ` – ${this.LANG.systemStatuses.incompatible()}`;
        const statusUnavailable = ` – ${this.LANG.systemStatuses.unavailable()}`;
        const statusOffline = ` – ${this.LANG.systemStatuses.offline()}`;
        const statusCloud = ` – ${this.LANG.dialogs.merge.cloud()}`;

        let stateOfHealth = (system.info && system.info.stateOfHealth) ||
            system.stateOfHealth || system.status || '';
        if (system.protoVersion && system.protoVersion !== this.system.moduleInfo.protoVersion) {
            stateOfHealth = 'incompatible';
        }

        let status = '';
        switch (stateOfHealth.toLowerCase()) {
            case 'online':
                if (Object.prototype.hasOwnProperty.call(system, 'canMerge') && !system.canMerge) {
                    status = statusIncompatible;
                }
                break;
            case 'offline':
                status = statusOffline;
                break;
            case 'incompatible':
                status = statusIncompatible;
                break;
            case 'unauthorized':
                break;
            default:
                if (Object.prototype.hasOwnProperty.call(system, 'isOnline') && !system.isOnline) {
                    status = statusOffline;
                } else {
                    status = statusUnavailable;
                }
        }
        if (environment.isLocal && !status && system.cloudSystemId) {
            status = statusCloud;
        }

        let systemName: string;
        if (system.systemName) {
            systemName = system.systemName;
            // finds first valid ipv4/ipv6 address
            const firstValidIp = system.remoteAddresses.find(addy => {
                return addy.split('.')[0].length <= 4 || addy.split(':')[0].length <= 4;
            }) || system.remoteAddresses[0];
            status = ` (${system.name}, ${cleanIp(firstValidIp)}:${system.port}) ${status}`;
        } else {
            systemName = system.name;
        }

        return [systemName, status];
    }

    checkMergeability(system) {
        let stateOfHealth = (system.info && system.info.stateOfHealth) || system.stateOfHealth || system.status || '';
        if (system.protoVersion && system.protoVersion !== this.system.moduleInfo.protoVersion) {
            stateOfHealth = 'Incompatible';
        }

        if ((Object.prototype.hasOwnProperty.call(system, 'isOnline') && !system.isOnline) || stateOfHealth.includes('offline')) {
            return this.systemOffline;
        }
        if ((Object.prototype.hasOwnProperty.call(system, 'isAvailable') && !system.isAvailable) || stateOfHealth.includes('unavailable')) {
            return this.secondarySystemUnavailable;
        }
        if (Object.prototype.hasOwnProperty.call(system, 'canMerge') && !system.canMerge) {
            return 'secondaryCannotMerge';
        }

        if (stateOfHealth === 'Incompatible') {
            return 'systemsIncompatible';
        }

        if (!this.system.canMerge) {
            return 'primaryCannotMerge';
        }
        if (!this.system.isOnline) {
            return 'primaryOffline';
        }
        if (!this.system.isAvailable) {
            return 'primarySystemUnavailable';
        }
        return '';
    }

    makeSelectorList(systems): SystemDropdownItem[] {
        return systems.map(system => {
            const [name, help] = this.getStatus(system);
            return {
                value: system.id,
                name,
                help,
                peer: Boolean(system.localSystemId)
            };
        });
    }

    selectDefaultSystem() {
        const systems = [...this.systemsWithInfo, ...this.peerSystems];
        for (const system of systems) {
            if (this.checkMergeability(system) === '') {
                return { ...system, value: system.id };
            }
        }
        return { ...systems[0], value: systems[0].id };
    }

    setSystems(): void {
        this.setPrimarySystem(this.primarySystem.id === this.system.id ? this.system : this.targetSystem);
        this.secondarySystem = this.primarySystem.id === this.system.id ? this.targetSystem : this.system;
        this.getSecondaryName();
    }

    serverUrlChange(input): void {
        // handles changing auto-discovered to Other System if url changed
        const { serverUrlInputValue } = this.machine.state.template;
        if (this.targetSystem.systemName && serverUrlInputValue !== input.value) {
            this.setTargetSystem({ value: this.otherSystem, name: this.LANG.dialogs.merge.otherSystem?.() });
        }
        // handles validation and check error messages
        const serverUrlError = this.processedSystems.length
            ? 'serverUrlValidationError' : 'noOtherSystemValidationError';
        const defaultState = this.machine.state.show.checkingErrorText
            ? this.serverUrlMergeError : this.serverUrlState;
        let showUpdate = this.processedSystems.length ? defaultState : 'noOtherSystemServerUrl';
        const templateUpdates: any = { serverUrlInputValue: input.value };
        if (input.touched && input.errors?.required) {
            showUpdate = serverUrlError;
            templateUpdates.serverUrlInputValidationErrorText = 'urlEmpty';
        } else if (input.touched && input.invalid) {
            showUpdate = serverUrlError;
            templateUpdates.serverUrlInputValidationErrorText = 'urlNotValid';
        }
        this.updateShow(showUpdate, templateUpdates);
    }

    // handles password error messages
    passwordChange(input): void {
        let showUpdate = '';
        const templateUpdates = { passwordErrorText: '', passwordValue: input.value };
        if (input.touched && input.errors?.required) {
            showUpdate = this.confirmPasswordError;
            templateUpdates.passwordErrorText = this.passwordRequired;
        } else {
            showUpdate = 'default';
            delete templateUpdates.passwordErrorText;
        }
        this.updateShow(showUpdate, templateUpdates);
    }

    close(msg?): void {
        this.remotePassword = undefined;
        this.clearTemplate();
        this.dialogRef.close(msg);
    }

    clearTemplate(): void {
        const { store } = this.machine;
        for (const state in store) {
            if (Object.prototype.hasOwnProperty.call(store, state)) {
                const { template } = store[state];
                for (const key in template) {
                    if (Object.prototype.hasOwnProperty.call(template, key)) {
                        template[key] = '';
                    }
                }
            }
        }
    }

    setPrimarySystem(system): void {
        this.primarySystem = system;
        this.primarySystem.stateOfHealth = this.primarySystem.stateOfHealth ||
            this.primarySystem.info && this.primarySystem.info.stateOfHealth;
        this.primaryName = htmlToEntity(this.primarySystem.name || this.primarySystem?.info.systemName || this.primarySystem?.info.name);
    }

    getSecondaryName(): void {
        let name: string = this.secondarySystem.name || this.secondarySystem.systemName ||
            this.secondarySystem?.info.name || this.secondarySystem?.info.systemName;
        if (name === this.LANG.dialogs.merge.otherSystem?.()) {
            name = this.LANG.dialogs.merge.serverAtUrl?.({ url: this.cleanUrl || this.serverUrl });
        }
        this.secondaryName = htmlToEntity(name);
    }
}
