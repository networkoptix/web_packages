import {
    Component, Input, ViewChild,
    ChangeDetectorRef, ElementRef
}                                      from '@angular/core';
import { NgbActiveModal }              from '@ng-bootstrap/ng-bootstrap';
import { NxConfigService, IConfig }    from '../../services/nx-config';
import { NxCloudApiService }           from '../../services/nx-cloud-api';
import { NxLanguageProviderService }   from '../../services/nx-language-provider';
import { NxProcessService }            from '../../services/process.service';
import { NxSystemService }             from '../../services/system.service';
import { NxSystemsService }            from '../../services/systems.service';
import { NxUtilsService }              from '../../services/utils.service';
import { LanguageI18NStaticTypes }     from '../../../language_i18n_static_types';
import StateMachine                    from './stateMachine';
import State                           from './stateForMergeDialog';
import * as md5                        from 'md5';

@Component({
    selector    : 'nx-modal-merge-content',
    templateUrl : 'merge.component.html',
    styleUrls   : ['merge.component.scss']
})
export class MergeModalContent {
    @Input() system;
    @Input() systems;
    @Input() systemName;
    @Input() closable;
    @Input() user;

    LANG: LanguageI18NStaticTypes;
    CONFIG: IConfig;
    account: any;
    checkMergeabilityProcess: any;
    checkMergeabilityFunction: any;
    checkPasswordProcess: any;
    mergingProcess: any;
    primarySystem: any;
    peerSystems = [];
    processedSystems = [];
    secondarySystem: any;
    serverUrl: string;
    cleanUrl: string;
    serverUrlInputExists: boolean;
    systemMergeable: string;
    targetSystem: any;
    targetSystemDropdown: any;
    targetSystemService: any;
    tooManyServers: boolean;
    nonCloudMerge = false;
    systemsLoaded = false;
    checking = false;
    dryRunAvailable = false;
    primaryName: string;
    secondaryName: string;
    systemUrls = {};

    // static variables
    readonly checkMerge: string = 'checkMerge';
    readonly checkMergeDefault: string = 'checkMergeDefault';
    readonly checkMergeError: string = 'checkMergeError';
    readonly serverUrlState: string = 'serverUrl';
    readonly serverUrlMergeError: string = 'serverUrlMergeError';
    readonly confirmPasswordError: string = 'confirmPasswordError';
    readonly serverUrlErrors: string = 'serverUrlErrors';
    readonly confirmMerge: string = 'confirmMerge';

    readonly differentOwners: string = 'differentOwners';
    readonly duplicateServers: string = 'duplicateServers';
    readonly noServerFound: string = 'noServerFound';
    readonly otherSystem: string = 'otherSystem';
    readonly passwordRequired: string = 'passwordRequired';
    readonly passwordWrong: string = 'passwordWrong';
    readonly secondarySystemUnavailable: string = 'secondarySystemUnavailable';
    readonly serverNotAvailable: string = 'serverNotAvailable';
    readonly systemOffline: string = 'systemOffline';
    readonly unknownError: string = 'unknownError';

    machine = new StateMachine(this.checkMerge, State);

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
        public activeModal: NgbActiveModal,
        private cloudApi: NxCloudApiService,
        private cdRef: ChangeDetectorRef,
        private processService: NxProcessService,
        private systemService: NxSystemService,
        private systemsService: NxSystemsService
    ) {
        this.CONFIG = configService.getConfig();
        this.LANG = languageService.translations;
    }

    ngOnInit() {
        this.init();
    }

    init(targetSystem?, currentUrl?) {
        this.dryRunAvailable = this.system.info.capabilities.merge_systems >= 1;
        if (this.system.canMerge) {
            this.setPrimarySystem(this.system);
            this.updateShow(this.checkMergeDefault);
            this.getPeerSystems()
                .then(() => {
                    return this.user.get().then(account => {
                        this.account = account;
                        return Promise.all(
                            this.systems.map(async system => {
                                if (!system.moduleInfo && !['offline', 'unavailable'].includes(system.stateOfHealth)) {
                                    const tempSystemService = this.systemService.createSystem(this.account.email, system.id);
                                    try {
                                        const moduleInfo = await tempSystemService.mediaserver.getModuleInfo().toPromise();
                                        system.moduleInfo = moduleInfo.reply;
                                    } catch (err) {
                                        system.status = 'offline';
                                        system.stateOfHealth = 'offline';
                                        console.error(err);
                                    }
                                    tempSystemService.stopPoll();
                                }
                                if (system.moduleInfo) {
                                    system.protoVersion = system.moduleInfo.protoVersion;
                                    system.isNew = system.moduleInfo.serverFlags.includes(this.CONFIG.system.flags.newSystem);
                                    system.moduleInfo.remoteAddresses.forEach((addy: string) => {
                                        this.systemUrls[`${addy}:${system.moduleInfo.port}`] = system.id.replace(/{|}/g, '');
                                    });
                                }
                            })
                        );
                    });
                })
                .then(() => {
                    if (this.systems.length === 0 && this.peerSystems.length === 0) {
                        this.targetSystem = { value: this.otherSystem, name: this.LANG.dialogs.merge.otherSystem };
                        this.secondarySystem = this.targetSystem;
                        this.updateShow('noOtherSystemServerUrl');
                    } else {
                        if (this.systems.length) {
                            this.processedSystems.push(
                                ...this.makeSelectorList(this.systems),
                                { name: 'horizontal' }
                            );
                        }
                        if (this.peerSystems.length) {
                            this.processedSystems.push(
                                ...this.makeSelectorList(this.peerSystems),
                                { name: 'horizontal' }
                            );
                        }
                        this.processedSystems.push({ value: this.otherSystem, name: this.LANG.dialogs.merge.otherSystem });
                        if (targetSystem) {
                            this.systemsService.forceUpdateSystems();
                            const systemsSubscription = this.systemsService.systemsSubject.subscribe(systems => {
                                this.systems = systems;
                                const updatedTargetSystem = [...this.systems, ...this.peerSystems]
                                    .find(system => system.id === targetSystem.id);
                                if (updatedTargetSystem) {
                                    updatedTargetSystem.value = updatedTargetSystem.id;
                                }
                                this.updateShow('', { helpText: this.LANG.dialogs.merge.ownerCanMergeText });
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
                                    helpText       : this.LANG.dialogs.merge.ownerCanMergeText,
                                    selectedTarget : this.targetSystemDropdown.value
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
                    this.mergeDropdown.dropdownToggleButton.nativeElement.focus();
                    this.initProcesses();
                });
        } else {
            this.machine.transition('thisSystemHasOutdatedServerError');
        }
    }

    updateShow(newShow?, templateVariable: any = {}) {
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
                    ? this.LANG.dialogs.merge.enterSystemAddressTitle
                    : this.LANG.dialogs.merge.mergeSystemsTitle;
                if (newBodyTitle !== template.bodyTitle) {
                    templateVariable.bodyTitle = newBodyTitle;
                }
                // clears serverUrl if going back to a checkMerge state
                if (
                    newShow.includes('checkMerge') &&
                    // skips when in "checking" state
                    templateVariable.helpText !== this.LANG.dialogs.merge.checking &&
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

    setTargetSystem(targetSystem, serverUrlInputValue = '') {
        // cancels process service if new system selected while checking
        if (this.checkMergeabilityProcess.processing) {
            this.checkMergeabilityProcess.processing = false;
            this.checkMergeabilityProcess.finished = true;
            this.checking = false;
            this.setTargetSystem(targetSystem, serverUrlInputValue);
        } else {
            let showUpdate = this.checkMergeDefault;
            const templateUpdates: any = {};
            if (targetSystem.value === this.otherSystem) {
                this.targetSystemDropdown = { value: this.otherSystem, name: this.LANG.dialogs.merge.otherSystem };
                this.targetSystem = targetSystem;
                showUpdate = this.serverUrlState;
                Object.assign(templateUpdates, { serverUrlInputValue, selectedTarget: this.otherSystem });
            } else {
                this.targetSystem = this.systems.find(system => system.id === targetSystem.value) ||
                    this.peerSystems.find(system => system.id === targetSystem.value);
                this.targetSystem.value = this.targetSystem.id;
                this.targetSystemDropdown = this.makeSelectorList([this.targetSystem])[0];
                this.systemMergeable = this.checkMergeability(this.targetSystem);
                Object.assign(templateUpdates, {
                    helpText       : this.LANG.dialogs.merge.ownerCanMergeText,
                    selectedTarget : this.targetSystem.value
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
            if (this.machine.state.show.serverUrlInput) {
                setTimeout(() => { this.serverUrlInputFocus.nativeElement.focus(); });
            }
        }
    }

    getPeerSystems() {
        return this.system.getPeerSystems().toPromise()
            .then(res => {
                this.peerSystems = res.reply
                    .filter(peer => !peer.cloudSystemId)
                    .map(peer => {
                        peer.remoteAddresses.forEach((addy: string) => {
                            this.systemUrls[`${addy}:${peer.port}`] = peer.id.replace(/{|}/g, '');
                        });
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
                    })
                    .sort((sysA, sysB) => {
                        const a = `${sysA.systemName.toLowerCase()}${sysA.name.toLowerCase()}`;
                        const b = `${sysB.systemName.toLowerCase()}${sysB.name.toLowerCase()}`;
                        return a < b ? -1 : 1;
                    });
            });
    }

    checkIfExistingSystem(url: string) {
        // if using otherSystem, checks if it matches an existing system in dropdown
        if (url && (/^https?:\/\//).test(url)) {
            url = url.slice(url.indexOf('://') + 3);
        }
        if (url && !(/:\d{1,5}$/).test(url)) {
            url += ':7001';
        }
        if (this.targetSystem.value === this.otherSystem && this.systemUrls[url]) {
            const targetSystem = this.systems.find(system => system.id === this.systemUrls[url]) ||
                this.peerSystems.find(system => system.id === this.systemUrls[url]);
            targetSystem.value = targetSystem.id;
            this.setTargetSystem(targetSystem, url);
        }
    }

    initProcesses() {
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
                this.serverUrlInputExists = Boolean(this.machine.state.template.serverUrlInputValue);
                if (!this.serverUrlInputExists) {
                    this.updateShow(this.checkMergeDefault, { helpText: this.LANG.dialogs.merge.checking });
                }
                return this.precheckSystemMerge();
            }, { ignoreError: true })
            .then(
                res => {
                    if (res !== 'canceled') {
                        this.checking = false;
                        // covers case where system (cloud & non-cloud) is not set up yet
                        if (res.isNew) {
                            if (this.serverUrl) {
                                const index = this.serverUrl.indexOf('//') + 2;
                                this.serverUrl = this.serverUrl.slice(0, index) + 'admin:admin@' + this.serverUrl.slice(index);
                            }
                            this.machine.transition(this.confirmMerge);
                        } else if (res.error === '0') {
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
                    if (err !== 'canceled') {
                        this.checking = false;
                        if (err.message === 'Timeout has occurred') {
                            err.message = this.noServerFound;
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
                if (this.machine.state.template.passwordValue) {
                    // for use case when password gets changed
                    if (this.serverUrl.includes('//admin:')) {
                        const startIndex = this.serverUrl.indexOf('//admin') + 2;
                        const endIndex = this.serverUrl.indexOf('@', startIndex + 1) + 1;
                        this.serverUrl = this.serverUrl.slice(0, startIndex) + this.serverUrl.slice(endIndex);
                    }
                    const index = this.serverUrl.indexOf('//') + 2;
                    this.serverUrl = this.serverUrl.slice(0, index) + `admin:${this.machine.state.template.passwordValue}@` + this.serverUrl.slice(index);
                }
                if (!this.dryRunAvailable) {
                    this.checkMergeabilityProcess.processing = false;
                    this.checkMergeabilityProcess.finished = true;
                    this.machine.transition(this.confirmMerge);
                } else {
                    return this.system.mergeSystems(this.serverUrl, true).toPromise()
                        .then(res => {
                            if (res.error === '0') {
                                this.machine.transition(this.confirmMerge);
                            } else if (res.errorString === 'UNAUTHORIZED') {
                                this.adminPassword.form.controls.adminPassword.setErrors({ passwordWrong: true });
                                this.updateShow(this.confirmPasswordError, {
                                    passwordErrorText : this.passwordWrong,
                                    passwordValue     : ''
                                });
                                this.adminPasswordInput.nativeElement.focus();
                            } else if (res.errorString) {
                                if (this.machine.currentState !== this.serverUrlErrors) {
                                    this.machine.transition(this.serverUrlErrors);
                                }
                                const newCheckMergeErrors = {
                                    CLOUD_SYSTEMS_HAVE_DIFFERENT_OWNERS : this.differentOwners,
                                    DUPLICATE_MEDIASERVER_FOUND         : this.duplicateServers,
                                    FAIL                                : this.systemOffline
                                };
                                this.updateShow(this.serverUrlErrors, {
                                    urlErrorText: newCheckMergeErrors[res.errorString] || this.serverNotAvailable
                                });
                            }
                        })
                        .catch(err => {
                            console.error(err);
                            this.updateShow('confirmPasswordError', { passwordErrorText: this.unknownError });
                            this.adminPasswordInput.nativeElement.focus();
                        });
                }
            }, { ignoreError: true });

        this.mergingProcess = this.processService
            .createProcess(() => {
                const password = this.machine.state.template.passwordValue;
                if (!password) {
                    return Promise.reject({ error: { data: { resultCode: 'missingPassword' } } });
                }

                if (this.nonCloudMerge) {
                    return this.dryRunAvailable
                        ? this.system.mergeSystems(this.serverUrl, false, password).toPromise()
                        : this.deprecatedMergeSystems(password);
                } else {
                    return this.cloudApi.merge(this.primarySystem.id, this.secondarySystem.id, password);
                }
            }, {
                errorCodes: {
                    mergedSystemIsOffline: () => {
                        return this.LANG.toastMessage.system.merge.failed;
                    },
                    vmsRequestFailure: () => {
                        return this.LANG.toastMessage.system.merge.failed;
                    },
                    missingPassword: () => {
                        this.updateShow(this.confirmPasswordError, { passwordErrorText: this.passwordRequired });
                        this.confirmMergeInput.nativeElement.focus();
                    },
                    wrongPassword: () => {
                        this.updateShow(this.confirmPasswordError, { passwordErrorText: this.passwordWrong, passwordValue: '' });
                        this.confirmMergeInput.nativeElement.focus();
                    }
                },
                ignoreError: true
            })
            .then(res => {
                if (res.error === '0' || res.resultCode === this.LANG.errorCodes.ok) {
                    // handles telling the app which systems are getting merged and the proper messaging
                    this.systemsService.forceUpdateSystems();
                    this.close({
                        secondary: {
                            id   : this.secondarySystem.id,
                            name : this.secondaryName
                        },
                        primary: {
                            id   : this.primarySystem.id,
                            name : this.primaryName
                        },
                        anotherSystemId : this.targetSystem.id,
                        role            : this.primarySystem.id === this.system.id
                            ? this.CONFIG.system.status.master
                            : this.CONFIG.system.status.slave
                    });
                // wrong cloud password
                } else if (res.errorString === 'Wrong username or password.') {
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
                    res.primarySystemName = this.primaryName;
                    res.secondarySystemName = this.secondaryName;
                    res.failedSystemName = this.primarySystem.stateOfHealth === 'online'
                        ? res.secondarySystemName
                        : res.primarySystemName;

                    this.activeModal.dismiss(res);
                    this.clearTemplate();
                }
            }, (error) => {
                // for errors that pop up during the merge
                let errorCode = error.resultCode || (error.data && error.data.resultCode);
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
                const err = error.data ? NxUtilsService.deepCopy(error.data) : {};
                err.resultCode = errorCode;
                err.errorText = (error && error.errorText) || '';

                err.primarySystemName = this.primaryName;
                err.secondarySystemName = this.secondaryName;

                err.failedSystemName = this.primarySystem.stateOfHealth === 'online'
                    ? err.secondarySystemName
                    : err.primarySystemName;

                this.activeModal.dismiss(err);
                this.clearTemplate();
            });
    }

    deprecatedMergeSystems(password) {
        // TO-DO (CLOUD-5154) move getting keys to system service
        return this.system.mediaserver.getNonce().toPromise()
            .then(res => {
                const { nonce, realm } = res.reply;
                const adminPassword = this.serverUrl.slice(this.serverUrl.indexOf('//admin') + 8, this.serverUrl.lastIndexOf('@'));
                const digest = md5(`admin:${realm}:${adminPassword}`);
                const postSimplified = md5(`${digest}:${nonce}:${md5('POST:')}`);
                const getSimplified = md5(`${digest}:${nonce}:${md5('GET:')}`);
                const postKey = btoa(`admin:${nonce}:${postSimplified}`);
                const getKey = btoa(`admin:${nonce}:${getSimplified}`);
                return this.system.mediaserver.deprecatedMergeSystems(this.serverUrl, getKey, postKey, password).toPromise();
            });
    }

    async precheckSystemMerge() {
        const isNew = { isNew: true };
        /**
         * targetSystem
         * no id = Other System
         * localSystemId = auto-discovered system
         * else = cloud-connected merge check
         */
        if (!this.targetSystem.id || this.targetSystem.localSystemId) {
            this.serverUrl = this.machine.state.template.serverUrlInputValue;
            if (!(/^https?:\/\//).test(this.serverUrl)) {
                this.serverUrl = `${window.location.protocol}//${this.serverUrl}`;
            }
            if (!(/:\d{1,5}$/).test(this.serverUrl)) {
                this.serverUrl += ':7001';
            }
            this.cleanUrl = this.serverUrl;

            this.nonCloudMerge = true;
            this.getSecondaryName();
            if (!this.dryRunAvailable) {
                this.checkMergeabilityProcess.processing = false;
                this.checkMergeabilityProcess.finished = true;
                this.checking = false;
                this.machine.transition('adminPassword');
            } else {
                return this.system.mergeSystems(this.serverUrl, true).toPromise()
                    .then(res => {
                        if (res.error !== '0') {
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
            }
        } else {
            this.getSecondaryName();
            this.targetSystemService = this.systemService.createSystem(this.account.email, this.targetSystem.id);
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

            let systems;
            try {
                systems = await Promise.all([
                    this.system.mediaserver.getModuleInfo().toPromise(),
                    this.targetSystemService.mediaserver.getModuleInfo().toPromise()
                ]);
            } catch (err) {
                if (err.status === 502) {
                    throw Error(this.systemOffline);
                }
            }

            const [sys1, sys2] = systems;
            if (sys1.reply.protoVersion === sys2.reply.protoVersion) {
                const [servers, target] = await Promise.all([
                    this.system.mediaserver.getMediaServers().toPromise(),
                    this.targetSystemService.mediaserver.getMediaServers().toPromise()
                ]);
                const serverIds = {};
                servers.forEach(server => {
                    serverIds[server.id] = true;
                });
                if (target.some(server => serverIds[server.id])) {
                    throw Error(this.duplicateServers);
                }
                this.tooManyServers = servers.length + target.length > this.CONFIG.maxServers;
            } else {
                throw Error(`systemVersion${sys1.reply.protoVersion < sys2.reply.protoVersion ? 'New' : 'Old'}`);
            }
            this.targetSystemService.stopPoll();
        }
        return this.targetSystem.isNew ? isNew : { error: '0' };
    }

    goBack() {
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

    insertErrorMessages() {
        const { errorText } = this.machine.state;
        for (const error in errorText) {
            errorText[error] = this.LANG.dialogs.merge[error]
                .replace(/{{primarySystem}}|{{targetSystem}}/g, (found: string) => {
                    return found === '{{primarySystem}}' ? this.primaryName : this.secondaryName;
                });
        }
    }

    addStatus(system) {
        const statusIncompatible = ` – ${this.LANG.systemStatuses.incompatible}`;
        const statusUnavailable  = ` – ${this.LANG.systemStatuses.unavailable}`;
        const statusOffline      = ` – ${this.LANG.systemStatuses.offline}`;

        let stateOfHealth      = (system.info && system.info.stateOfHealth) ||
            system.stateOfHealth || system.stateMessage || system.status || '';
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
            case 'unavailable':
                status = statusUnavailable;
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

        let systemName;
        if (system.systemName) {
            systemName = system.systemName;
            status = ` (${system.name}, ${system.remoteAddresses[0]}:${system.port}) ${status}`;
        } else {
            systemName = system.name || system.info.name;
        }

        // HTML required for dropdown list
        return `<span>${systemName}</span><span class="text-muted">${status}</span>`;
    }

    checkMergeability(system) {
        let stateOfHealth = (system.info && system.info.stateOfHealth) || system.stateOfHealth || system.stateMessage || system.status || '';
        if (system.protoVersion && system.protoVersion !== this.system.moduleInfo.protoVersion) {
            stateOfHealth = 'Incompatible';
            system.olderProtocol = system.protoVersion < this.system.moduleInfo.protoVersion;
        }

        if ((Object.prototype.hasOwnProperty.call(system, 'isOnline') && !system.isOnline) || stateOfHealth.indexOf('offline') > -1) {
            return this.systemOffline;
        }
        if ((Object.prototype.hasOwnProperty.call(system, 'isAvailable') && !system.isAvailable) || stateOfHealth.indexOf('unavailable') > -1) {
            return this.secondarySystemUnavailable;
        }
        if (Object.prototype.hasOwnProperty.call(system, 'canMerge') && !system.canMerge) {
            return 'secondaryCannotMerge';
        }

        if (stateOfHealth === 'Incompatible') {
            return system.olderProtocol ? 'systemVersionOld' : 'systemVersionNew';
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

    makeSelectorList(systems) {
        return systems.map(system => {
            return {
                value : system.id,
                name  : this.addStatus(system),
                peer  : Boolean(system.localSystemId)
            };
        });
    }

    selectDefaultSystem() {
        const systems = [...this.systems, ...this.peerSystems];
        for (const system of systems) {
            if (this.checkMergeability(system) === '') {
                return { ...system, value: system.id };
            }
        }
        return { ...systems[0], value: systems[0].id };
    }

    setSystems() {
        this.setPrimarySystem(this.primarySystem.id === this.system.id ? this.system : this.targetSystem);
        this.secondarySystem = this.primarySystem.id === this.system.id ? this.targetSystem : this.system;
        this.getSecondaryName();
    }

    serverUrlChange(input) {
        // handles changing auto-discovered to Other System if url changed
        const { serverUrlInputValue } = this.machine.state.template;
        if (this.targetSystem.systemName && serverUrlInputValue !== input.value) {
            this.setTargetSystem({ value: this.otherSystem, name: this.LANG.dialogs.merge.otherSystem });
        }
        // handles validation error messages
        const serverUrlError = this.processedSystems.length ? 'serverUrlValidationError' : 'noOtherSystemValidationError';
        let showUpdate = this.processedSystems.length ? this.serverUrlState : 'noOtherSystemServerUrl';;
        const templateUpdates: any = { serverUrlInputValue: input.value };
        if (input.touched && input.errors && input.errors.required) {
            showUpdate = serverUrlError;
            templateUpdates.serverUrlInputValidationErrorText = 'urlEmpty';
        } else if (input.touched && input.invalid) {
            showUpdate = serverUrlError;
            templateUpdates.serverUrlInputValidationErrorText = 'urlNotValid';
        }
        this.updateShow(showUpdate, templateUpdates);
    }

    // handles password error messages
    passwordChange(input) {
        let showUpdate        = '';
        const templateUpdates = { passwordErrorText: '', passwordValue: input.value };
        if (input.touched && input.errors && input.errors.required) {
            showUpdate = this.confirmPasswordError;
            templateUpdates.passwordErrorText = this.passwordRequired;
        } else {
            showUpdate = 'default';
            delete templateUpdates.passwordErrorText;
        }
        this.updateShow(showUpdate, templateUpdates);
    }

    close(data?) {
        this.clearTemplate();
        this.activeModal.close(data);
    }

    clearTemplate() {
        const { store } = this.machine;
        for (const state in store) {
            const { template } = store[state];
            for (const key in template) {
                template[key] = '';
            }
        }
    }

    setPrimarySystem(system) {
        this.primarySystem = system;
        this.primarySystem.stateOfHealth = this.primarySystem.stateOfHealth ||
            this.primarySystem.info && this.primarySystem.info.stateOfHealth;
        this.primaryName = this.primarySystem.name || this.primarySystem.info && this.primarySystem.info.name;
    }

    getSecondaryName() {
        let name: string = this.secondarySystem.systemName ||
            this.secondarySystem.name ||
            this.secondarySystem.info && this.secondarySystem.info.name;
        if (name === this.LANG.dialogs.merge.otherSystem) {
            name = this.LANG.dialogs.merge.serverAtUrl.replace('{{url}}', this.cleanUrl || this.serverUrl);
        }
        this.secondaryName = name;
    }
}
