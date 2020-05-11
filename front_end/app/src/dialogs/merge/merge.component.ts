import {
    Component, Input, ViewChild,
    ChangeDetectorRef
}                                      from '@angular/core';
import { NgbActiveModal }              from '@ng-bootstrap/ng-bootstrap';
import {
    NxConfigService, IConfig, NxAccountService
}                                      from '../../services';
import { NxCloudApiService }           from '../../services/nx-cloud-api';
import { NxLanguageProviderService }   from '../../services/nx-language-provider';
import { NxProcessService }            from '../../services/process.service';
import { NxSystemService }             from '../../services/system.service';
import { NxSystemsService }            from '../../services/systems.service';
import { LanguageI18NStaticTypes }     from '../../../language_i18n_static_types';
import StateMachine                    from './stateMachine';
import State                           from './stateForMergeDialog';

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
    account: NxAccountService;
    checkMergeabilityProcess: any;
    checkPasswordProcess: any;
    mergingProcess: any;
    primarySystem: any;
    peerSystems = [];
    processedSystems = [];
    secondarySystem: any;
    serverUrl: string;
    serverUrlInputExists: boolean;
    systemMergeable: string;
    targetSystem: any;
    targetSystemDropdown: any;
    targetSystemService: any;
    tooManyServers: boolean;
    nonCloudMerge = false;
    peerSystemsLoaded = false;
    checking = false;
    secondaryName: string;

    // static variables
    readonly checkMerge: string = 'checkMerge';
    readonly checkMergeDefault: string = 'checkMergeDefault';
    readonly checkMergeError: string = 'checkMergeError';
    readonly serverUrlState: string = 'serverUrl';
    readonly serverUrlMergeError: string = 'serverUrlMergeError';
    readonly serverUrlValidationError: string = 'serverUrlValidationError';
    readonly confirmPasswordError: string = 'confirmPasswordError';
    readonly serverUrlErrors: string = 'serverUrlErrors';

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
    @ViewChild('adminPasswordForm') adminPassword: HTMLFormElement;
    @ViewChild('primaryRadio') primaryRadio: any;
    @ViewChild('confirmMerge') confirmMerge: HTMLFormElement;

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
        this.LANG = languageService.getTranslations();
    }

    ngOnInit() {
        if (this.system.canMerge) {
            this.primarySystem = this.system;
            this.getPeerSystems()
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
                            this.user.get().then(account => { this.account = account; });
                        }
                        if (this.peerSystems.length) {
                            this.processedSystems.push(
                                ...this.makeSelectorList(this.peerSystems),
                                { name: 'horizontal' }
                            );
                        }
                        this.processedSystems.push({ value: this.otherSystem, name: this.LANG.dialogs.merge.otherSystem });
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
                                templateUpdates.serverUrlInputValue = this.targetSystem.url;
                                delete templateUpdates.helpText;
                            }
                            this.updateShow(show, templateUpdates);
                        }
                    }
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
    }

    getPeerSystems() {
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
                    })
                    .sort((sysA, sysB) => {
                        const a = `${sysA.systemName.toLowerCase()}${sysA.name.toLowerCase()}`;
                        const b = `${sysB.systemName.toLowerCase()}${sysB.name.toLowerCase()}`;
                        return a < b ? -1 : 1;
                    });
                this.peerSystemsLoaded = true;
            });
    }

    initProcesses() {
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
                    this.checking = false;
                    if (res.error === '0') {
                        if (this.serverUrlInputExists) {
                            this.machine.transition('adminPassword');
                        } else {
                            this.primarySystem = this.system;
                            this.setSystems();
                            this.machine.transition('choosePrimary');
                        }
                    }
                },
                err => {
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
            );

        this.checkPasswordProcess = this.processService
            .createProcess(() => {
                // for use case when password gets changed
                if (this.serverUrl.includes('//admin:')) {
                    const startIndex = this.serverUrl.indexOf('//admin') + 2;
                    const endIndex = this.serverUrl.indexOf('@', startIndex + 1) + 1;
                    this.serverUrl = this.serverUrl.slice(0, startIndex) + this.serverUrl.slice(endIndex);
                }
                const index = this.serverUrl.indexOf('//') + 2;
                this.serverUrl = this.serverUrl.slice(0, index) + `admin:${this.machine.state.template.passwordValue}@` + this.serverUrl.slice(index);
                return this.system.mergeSystems(this.serverUrl, true).toPromise()
                    .then(res => {
                        if (res.error === '0') {
                            this.machine.transition('confirmMerge');
                        } else if (res.errorString === 'UNAUTHORIZED') {
                            this.adminPassword.form.controls.adminPassword.setErrors({ passwordWrong: true });
                            this.updateShow(this.confirmPasswordError, {
                                passwordErrorText : this.passwordWrong,
                                passwordValue     : ''
                            });
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
                    });
            }, { ignoreError: true });

        this.mergingProcess = this.processService
            .createProcess(() => {
                const password = this.machine.state.template.passwordValue;
                if (!password) {
                    return Promise.reject({ error: { data: { resultCode: 'missingPassword' } } });
                }

                if (this.nonCloudMerge) {
                    return this.system.mergeSystems(this.serverUrl, false, password).toPromise();
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
                    },
                    wrongPassword: () => {
                        this.updateShow(this.confirmPasswordError, { passwordErrorText: this.passwordWrong, passwordValue: '' });
                    }
                }
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
                            name : this.primarySystem.name || this.primarySystem.info.name
                        },
                        anotherSystemId : this.targetSystem.id,
                        role            : this.primarySystem.id === this.system.id
                            ? this.CONFIG.system.status.master
                            : this.CONFIG.system.status.slave
                    });
                } else if (res.errorString === 'Wrong username or password.') {
                    this.confirmMerge.form.controls.cloudOwnerPassword.setErrors({ passwordWrong: true });
                    this.updateShow(this.confirmPasswordError, { passwordErrorText: this.passwordWrong });
                } else if (res.errorString) {
                    this.confirmMerge.form.controls.cloudOwnerPassword.setErrors({ unknownError: true });
                    this.updateShow(this.confirmPasswordError, { passwordErrorText: this.unknownError });
                }
            }, (error) => {
                // for errors that pop up during the merge
                const errorCode = error.resultCode || (error.data?.resultCode);
                if (errorCode === 'missingPassword' || errorCode === 'wrongPassword') {
                    return;
                }

                /* Get the names of the primary and secondary system.
                    Next try to figure out which system caused the problem.
                    If the primary system's stateOfHealth is not online set it as the failedSystem.
                    Otherwise the secondary system is set as the failedSystem no matter what.
                */

                if (!error.data) {
                    error.data = {};
                }

                error.data.resultCode = errorCode;
                error.data.errorText = (error?.errorText) || '';
                // Set the name of the primary system.
                error.data.primarySystemName = this.primarySystem.name;
                // If name is undefined try looking in info for the name.
                if (error.data.primarySystemName === undefined) {
                    error.data.primarySystemName = this.primarySystem.info && this.primarySystem.info.name;
                }

                // Set the name of the secondary system.
                error.data.secondarySystemName = this.secondarySystem.name;

                // If name is undefined try looking in info for the name.
                if (error.data.secondarySystemName === undefined) {
                    error.data.secondarySystemName = this.secondarySystem.info && this.secondarySystem.info.name;
                }

                // Check the state of health
                let primaryState = this.primarySystem.stateOfHealth;
                // If stateOfHealth is undefined check in info for stateOfHealth.
                if (primaryState === undefined) {
                    primaryState = this.primarySystem.info && this.primarySystem.info.stateOfHealth;
                }

                // Assume the secondary system is the issue unless the primary system is not online.
                error.data.failedSystemName = error.data.secondarySystemName;
                if (primaryState !== 'online') {
                    error.data.failedSystemName = error.data.primarySystemName;
                }
                this.activeModal.dismiss(error.data);
            });
    }

    async precheckSystemMerge() {
        /**
         * targetSystem
         * no id = Other System
         * localSystemId = auto-discovered system
         * else = cloud-connected merge check
         */
        if (!this.targetSystem.id || this.targetSystem.localSystemId) {
            this.nonCloudMerge = true;
            this.serverUrl = this.machine.state.template.serverUrlInputValue;
            this.getSecondaryName();
            if (!(/^https?:\/\//).test(this.serverUrl)) {
                this.serverUrl = `${window.location.protocol}//${this.serverUrl}`;
            }
            if (!(/:\d{1,5}$/).test(this.serverUrl)) {
                this.serverUrl += ':7001';
            }
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
                    return res;
                });
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
        return Promise.resolve({ error: '0' });
    }

    goBack(serverUrlError?) {
        this.confirmMerge && this.confirmMerge.form.markAsUntouched();
        this.adminPassword && this.adminPassword.form.markAsUntouched();
        this.machine.goBack();
        this.cdRef.detectChanges();
        this.mergeDropdown && this.mergeDropdown.dropdownToggleButton.nativeElement.focus();
        this.primaryRadio && this.primaryRadio.inputRadio.nativeElement.focus();
        const { template } = this.machine.state;
        if (serverUrlError) {
            this.updateShow(this.serverUrlMergeError, {
                serverUrlInputValue : template.serverUrlInputValue,
                checkingErrorText   : serverUrlError
            });
            this.setTargetSystem({ value: template.selectedTarget });
        } else if (this.machine.currentState === this.checkMerge) {
            this.updateShow('', { helpText: this.LANG.dialogs.merge.ownerCanMergeText });
            this.setTargetSystem(this.targetSystem, template.serverUrlInputValue);
        }
    }

    insertErrorMessages() {
        const { errorText } = this.machine.state;
        const targetSystemName = this.secondaryName;
        const primarySystemName = this.primarySystem.name || this.primarySystem.info.name;
        for (const error in errorText) {
            errorText[error] = this.LANG.dialogs.merge[error]
                .replace(/{{primarySystem}}|{{targetSystem}}/g, found => {
                    return found === '{{primarySystem}}' ? primarySystemName : targetSystemName;
                });
        }
    }

    addStatus(system) {
        let status               = '';
        const statusIncompatible = ` – ${this.LANG.systemStatuses.incompatible}`;
        const statusUnavailable  = ` – ${this.LANG.systemStatuses.unavailable}`;
        const statusOffline      = ` – ${this.LANG.systemStatuses.offline}`;
        const stateOfHealth      = (system.info?.stateOfHealth) ||
            system.stateOfHealth || system.stateMessage || system.status || '';
        switch (stateOfHealth.toLowerCase()) {
            case 'online':
                if (!system.canMerge) {
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
        const stateOfHealth = (system.info?.stateOfHealth) || system.stateOfHealth || system.stateMessage || system.status || '';

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
            return system.olderProtocol ? 'serverVersionOld' : 'serverVersionNew';
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
        this.primarySystem = this.primarySystem.id === this.system.id ? this.system : this.targetSystem;
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
        let showUpdate             = this.serverUrlState;
        const templateUpdates: any = { serverUrlInputValue: input.value };
        if (input.touched && input.errors?.required) {
            showUpdate = this.serverUrlValidationError;
            templateUpdates.serverUrlInputValidationErrorText = 'urlEmpty';
        } else if (input.touched && input.invalid) {
            showUpdate = this.serverUrlValidationError;
            templateUpdates.serverUrlInputValidationErrorText = 'urlNotValid';
        }
        this.updateShow(showUpdate, templateUpdates);
    }

    // handles password error messages
    passwordChange(input) {
        let showUpdate        = '';
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

    close(data?) {
        this.updateShow('', {
            passwordValue                     : '',
            serverUrlInputValue               : '',
            passwordErrorText                 : '',
            checkingErrorText                 : '',
            serverUrlInputValidationErrorText : ''
        });
        this.activeModal.close(data);
    }

    getSecondaryName() {
        let name: string = this.secondarySystem.systemName ||
            this.secondarySystem.name ||
            this.secondarySystem.info && this.secondarySystem.info.name;
        if (name === this.LANG.dialogs.merge.otherSystem) {
            name = this.LANG.dialogs.merge.serverAtUrl.replace('{{url}}', this.serverUrl);
        }
        this.secondaryName = name;
    }
}
