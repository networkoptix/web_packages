import { Component, Input, Renderer2, ViewChild, forwardRef } from '@angular/core';
import { NgbActiveModal }            from '@ng-bootstrap/ng-bootstrap';
import { NxConfigService }           from '../../services/nx-config';
import { NxCloudApiService }         from '../../services/nx-cloud-api';
import { NxLanguageProviderService } from '../../services/nx-language-provider';
import { NxProcessService }          from '../../services/process.service';
import { NxSystemService }           from '../../services/system.service';
import { NxSystemsService }          from '../../services/systems.service';
import StateMachine from './stateMachine';

@Component({
    selector   : 'nx-modal-merge-content',
    templateUrl: 'merge.component.html',
    styleUrls  : ['merge.component.scss'],
})
export class MergeModalContent {
    @Input() system;
    @Input() systems;
    @Input() peerSystems;
    @Input() systemName;
    @Input() closable;
    @Input() user;

    LANG: any;
    checking: boolean;
    checkMergeabilityProcess: any;
    CONFIG: any;
    mergingProcess: any;
    multipleSystems: boolean;
    password: string;
    primarySystem: any;
    processedSystems = [];
    secondarySystem: any;
    state: string;
    systemMergeable: string;
    targetSystem: any;
    targetSystemDropdown: any;
    tooManyServers: boolean;
    wrongPassword: boolean;
    serverUrl: string;

    account: any;

    selectedSystemInDropdown: any;
    checkingErrorText: string;
    serverUrlInputValue: string;
    serverUrlInputValidationErrorText: string;

    @ViewChild('confirmMergeForm', { static: false }) mergeForm: HTMLFormElement;

    constructor(public activeModal: NgbActiveModal,
                public renderer: Renderer2,
                private configService: NxConfigService,
                private cloudApi: NxCloudApiService,
                private language: NxLanguageProviderService,
                private processService: NxProcessService,
                private systemService: NxSystemService,
                private systemsService: NxSystemsService
    ) {
        this.CONFIG = this.configService.getConfig();
        this.LANG = this.language.getTranslations();
        this.checking = false;
        this.state = 'select';
        this.wrongPassword = false;
    }

    stateMachine = {
        thisSystemHasOutdatedServerError: {
            show: {}, template: {}, errorText: {}, validationErrorText: {},
        },
        checkMerge: {
            show: {
                mergeSystemText: true,
                systemDropdown: true,
                noSystemText: false,
                ownerCanMergeText: true,
                checkingText: false,
                serverUrlText: false,
                serverUrlInput: false,
                serverUrlInputValidationError: false,
                checkingErrorText: false,
            },
            showUpdates: {
                checkMergeDefault: {
                    mergeSystemText: true,
                    systemDropdown: true,
                    ownerCanMergeText: true,
                },
                checkMergeChecking: {
                    mergeSystemText: true,
                    systemDropdown: true,
                    checkingText: true,
                },
                checkMergeError: {
                    mergeSystemText: true,
                    systemDropdown: true,
                    checkingErrorText: true,
                },
                serverUrl: {
                    mergeSystemText: true,
                    systemDropdown: true,
                    serverUrlText: true,
                    serverUrlInput: true,
                },
                serverUrlValidationError: {
                    mergeSystemText: true,
                    systemDropdown: true,
                    serverUrlText: true,
                    serverUrlInput: true,
                    serverUrlInputValidationError: true,
                },
                serverUrlMergeError: {
                    mergeSystemText: true,
                    systemDropdown: true,
                    serverUrlText: true,
                    serverUrlInput: true,
                    checkingErrorText: true,
                },
                noOtherSystemServerUrl: {
                    noSystemText: true,
                    serverUrlText: true,
                    serverUrlInput: true,
                },
                noOtherSystemValidationError: {
                    noSystemText: true,
                    serverUrlText: true,
                    serverUrlInput: true,
                    serverUrlInputValidationError: true,
                },
                noOtherSystemMergeError: {
                    noSystemText: true,
                    serverUrlText: true,
                    serverUrlInput: true,
                    checkingErrorText: true,
                },
            },
            template: {
                selectedSystemInDropdown: {},
                checkingErrorText: '',
                serverUrlInputValue: '',
                serverUrlInputValidationErrorText: '',
                nextButtonAction: undefined,
            },
            errorText: {
                systemOffline: '',
                primarySystemOffline: '',
                systemVersionOld: '',
                systemVersionNew: '',
                primarySystemUnavailable: '',
                secondarySystemUnavailable: '',
                duplicateServers: '',
                unknownError: '',
                noServerFound: '',
                serverNotYours: '',
                serverVersionOld: '',
                serverVersionNew: '',
            },
            validationErrorText: {
                urlEmpty: '',
                urlNotValid: '',
            },
        },
        adminPassword: {
            show: {
                enterPasswordText: true,
                loginLabel: true,
                loginNameDisabledInput: true,
                passwordLabel: true,
                passwordInput: true,
                passwordValidationError: false,
                passwordCheckError: false,
            },
        },
        choosePrimary: {
            template: {
                selectedPrimarySystem: '',
            },
        },
        confirmMerge: {
            show: {
                maxServerWarningText: false,
                passwordValidationError: false,
                passwordCheckError: false,
            },
            showUpdates: {
                default: {
                    maxServerWarningText: false,
                    passwordValidationError: false,
                    passwordCheckError: false,
                },
                addMaxServerWarningText: {
                    maxServerWarningText: true,
                },
                addPasswordValidationError: {
                    passwordValidationError: true,
                },
                addPasswordCheckError: {
                    passwordCheckError: true,
                }
            },
            template: {
                passwordText: '',
                confirmMergeButtonAction: undefined,
            },
            errorText: {},
            validationErrorText: {},
        }
    };

    machine = new StateMachine('checkMerge', this.stateMachine);

    updateShow(newShow?, templateVariable?) {
        console.log('machine state in updateShow', this.machine.state);
        console.log('newShow?', newShow);
        console.log('templateVariable?', templateVariable);
        const { showUpdates, show, template } = this.machine.state;
        if (newShow) {
            Object.keys(show).forEach(e => {
                show[e] = showUpdates[newShow][e] ? true : false;
            });
        }
        if (templateVariable) {
            for (const update in templateVariable) {
                template[update] = templateVariable[update];
                this[update] = templateVariable[update];
            }
        } else {
            ['serverUrlInputValidationErrorText', 'checkingErrorText']
                .forEach(errorText => template[errorText] = '');
        }
    }

    // call this when dropdown changes
    insertErrorMessages() {
        const { errorText, validationErrorText } = this.machine.state;
        const targetSystemName = this.targetSystem.name || this.targetSystem.info.name;
        const primarySystemName = this.primarySystem.name || this.primarySystem.info.name;
        for (const error in errorText) {
            errorText[error] = this.LANG.dialogs.merge[error]
                .replace(/{{primarySystem}}|{{targetSystem}}/g, found => {
                    return found === '{{primarySystem}}' ? primarySystemName : targetSystemName;
                });
        }
        for (const error in validationErrorText) {
            validationErrorText[error] = this.LANG.dialogs.merge[error];
        }
    }

    ngOnInit() {
        if (this.system.canMerge) {
            this.primarySystem = this.system;
            if (this.systems.length === 0) {
                this.updateShow('noOtherSystemServerUrl');
                this.targetSystem = 'Other System';
            } else {
                if (this.systems.length) {
                    this.processedSystems.push(
                        ...this.makeSelectorList(this.systems),
                        { name: 'horizontal' }
                    );
                }
                if (this.peerSystems.length) {
                    // eventually need to sort the peerSystem
                    this.processedSystems.push(
                        ...this.makeSelectorList(this.peerSystems),
                        { name: 'horizontal' }
                    );
                }
                this.processedSystems.push({ name: 'Other System...' });

                console.log('prcoessedSystem', this.processedSystems);
                this.targetSystem = this.selectDefaultSystem();
                console.log('this.targetSystem on set', this.targetSystem);
                this.targetSystemDropdown = this.makeSelectorList([this.targetSystem])[0];
                console.log('this.targetSystemDropDown on set', this.targetSystemDropdown);
                this.systemMergeable = this.checkMergeability(this.targetSystem);
                console.log('systemMergeable', this.systemMergeable);
            }
            this.secondarySystem = this.targetSystem; // target Other System?
            // FUTURE: when switching states, clear error state/messages
            this.insertErrorMessages();
            if (this.systemMergeable) {
                this.updateShow(
                    'checkMergeError',
                    { checkingErrorText: this.machine.state.errorText[this.systemMergeable] }
                );
            }
            console.log('this.machine post transition', this.machine);
            console.log('show in machine state', this.machine.state.show);
            console.log('systems', this.systems);
    
            this.user.get().then((account) => {
                this.account = account;
            });
    
            this.initProcesses();
        } else {
            this.machine.transition('thisSystemHasOutdatedServerError');
        }

    }

    initProcesses() {
        this.mergingProcess = this.processService.createProcess(() => {
            this.wrongPassword = false;
            this.mergeForm.controls.mergePassword.setErrors(undefined);

            if (!this.password) {
                return Promise.reject({ error: { data: {resultCode : 'missingPassword'}}});
            }
            return this.cloudApi.merge(this.primarySystem.id, this.secondarySystem.id, this.password);
        }, {
            errorCodes: {
                mergedSystemIsOffline: () => {
                    return this.LANG.toastMessages.system.merge.failed;
                },
                vmsRequestFailure: () => {
                    return this.LANG.toastMessages.system.merge.failed;
                },
                missingPassword: () => {
                    this.mergeForm.controls.mergePassword.setErrors({ required: true });
                },
                wrongPassword: () => {
                    this.wrongPassword = true;
                    this.mergeForm.controls.mergePassword.setErrors({ wrongPassword: true });
                    // Do not reset the value - it will reset errors for this field
                    // this.password = '';

                    this.renderer.selectRootElement('#mergePassword').focus();
                },
            },
            successMessage: this.LANG.toastMessage.system.merge.start
        }).then(res => {
            console.log('then from cloudapi merge', res);
            this.systemsService.forceUpdateSystems();
            this.activeModal.close({
                anotherSystemId: this.targetSystem.id,
                role: this.primarySystem.id === this.system.id ?
                    this.CONFIG.systemStatuses.master :
                    this.CONFIG.systemStatuses.slave
            });
        }, (error) => {
            console.log('error from cloudapi merge', error);
            const errorCode = error.resultCode || error.data && error.data.resultCode;
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
            error.data.errorText = error && error.errorText || '';
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

        this.checkMergeabilityProcess = this.processService.createProcess(() => {
            console.log('checkMergeability CALLED');
            this.updateShow('checkMergeChecking');
            return this.precheckSystemMerge().finally(() => {
                this.targetSystemDropdown.name = this.addStatus(this.targetSystem);
                console.log('targetSystemDropdown name', this.targetSystemDropdown.name);
                this.systemMergeable = this.checkMergeability(this.targetSystem);
                console.log('systemMergeable', this.systemMergeable);
            });
        })
            .then((res) => {
                console.log('res from precheckSystemMerge', res);
                if (!res.system && this.systemMergeable === '') {
                    this.machine.transition('choosePrimary');
                } else {
                    this.updateShow(
                        'checkMergeError',
                        { checkingErrorText: this.machine.state.errorText[this.systemMergeable] }
                    );
                }
            }, err => {
                console.error('error in catch', err);
                this.updateShow(
                    'checkMergeError',
                    { checkingErrorText: this.machine.state.errorText[this.systemMergeable] }
                );
            });
    }

    addStatus(system) {
        let status = '';
        const statusIncompatible = ` – ${this.LANG.systemStatuses.incompatible}`;
        const statusUnavailable = ` – ${this.LANG.systemStatuses.unavailable}`;
        const statusOffline = ` – ${this.LANG.systemStatuses.offline}`;
        const stateOfHealth = system.info && 
            system.info.stateOfHealth || system.stateOfHealth || system.stateMessage || system.status || '';
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
            default:
                if (system.hasOwnProperty('isOnline') && !system.isOnline) {
                    status = statusOffline;
                } else {
                    status = statusUnavailable;
                }
        }

        let systemName;
        if (system.systemName) {
            systemName = system.systemName.slice(0, -1);
            status = ` (${system.name}, ${system.remoteAddresses[0]}:${system.port}) ${status}`;
        } else {
            systemName = system.name || system.info.name;
        }

        // HTML required for dropdown list
        return `<span>${systemName}</span><span class="text-muted">${status}</span>`;
    }

    // Add system can merge where added to systems form api call
    checkMergeability(system) {
        // add something for incompatible version?
        const stateOfHealth = system.info && system.info.stateOfHealth || system.stateOfHealth || system.stateMessage || system.status || '';

        if (system.hasOwnProperty('isOnline') && !system.isOnline || stateOfHealth.indexOf('offline') > -1) {
            return 'systemOffline';
        }
        if (system.hasOwnProperty('isAvailable') && !system.isAvailable || stateOfHealth.indexOf('unavailable') > -1) {
            return 'secondarySystemUnavailable';
        }
        if (!system.canMerge) {
            return 'secondaryCannotMerge';
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

    precheckSystemMerge() {
        this.targetSystem = this.systemService.createSystem(this.account.email, this.targetSystem.id);

        return this.targetSystem.getInfo(true, false).then(() => {
            return this.targetSystem.getUsersDataFromTheSystem().then(() => {
                return Promise.all([
                    this.system.mediaserver.getMediaServers().toPromise().catch(error => {
                        return Promise.reject({error: { data: { resultCode:  'current'}, errorResponse: error }});
                    }),
                    this.targetSystem.mediaserver.getMediaServers().toPromise().catch(error => {
                        return Promise.reject({ error: { data: { resultCode: 'target'}, errorResponse: error }});
                    })
                ]).then(systems => {
                    this.tooManyServers = systems[0].length + systems[1].length > this.CONFIG.maxServers;
                    return Promise.resolve({});
                });
            })
                .catch(err => Promise.reject({ fromGetUsers: err }))
                .finally(() => this.targetSystem.stopPoll());
        });
    }

    makeSelectorList(systems) {
        return systems.map(system => {
            return { value: system.id, name: this.addStatus(system) };
        });
    }

    primaryPicked() {
        this.machine.transition('confirmMerge');
        return Promise.resolve();
    }

    selectDefaultSystem() {
        const systems = [...this.systems, ...this.peerSystems];
        for (const system of systems) {
            if (this.checkMergeability(system) === '') {
                return {...system};
            }
        }
        return { ...systems[0], value: systems[0].id };
    }

    setSystems() {
        this.primarySystem = this.primarySystem.id === this.system.id ? this.system : this.targetSystem;
        this.secondarySystem = this.primarySystem.id === this.system.id ? this.targetSystem : this.system;
    }

    setTargetSystem(targetSystem) {
        console.log('targetSystem to be set', targetSystem);
        if (targetSystem.name === 'Other System...') {
            this.targetSystem = {};
            this.updateShow('serverUrl', { serverUrlInputValue: '' });
        } else {
            this.systemMergeable = '';
            this.targetSystem = {
                ...this.systems.find(system => system.id === targetSystem.value),
                ...this.peerSystems.find(system => system.id === targetSystem.value)
            };
            this.targetSystem.value = this.targetSystem.id;
            this.systemMergeable = this.checkMergeability(this.targetSystem);
            this.insertErrorMessages();

            let showUpdate = 'checkMergeDefault';
            const templateUpdates: any = {};
            if (this.targetSystem.systemName) {
                showUpdate = 'serverUrl';
                templateUpdates.serverUrlInputValue = `${this.targetSystem.remoteAddresses[0]}:${this.targetSystem.port}`;
            }
            if (this.systemMergeable) {
                showUpdate = this.targetSystem.systemName ? 'serverUrlMergeError' : 'checkMergeError';
                templateUpdates.checkingErrorText = this.machine.state.errorText[this.systemMergeable];
            }
            this.updateShow(showUpdate, templateUpdates);
        }
        this.setSystems();
    }

    serverUrlChange() {
        if (this.targetSystem.systemName) {
            this.targetSystemDropdown = { name: 'Other System...' };
            this.targetSystem = {};
        }
    }

    // updateState() {
    //     switch (this.state) {
    //         case 'select':
    //             this.state = this.tooManyServers ? 'warning' : 'confirm';
    //             break;
    //         case 'warning':
    //             this.state = 'confirm';
    //             break;
    //         default:
    //             break;
    //     }
    // }

    canShowRequired(element) {
        return element.invalid && element.errors.required && !this.wrongPassword;
    }

    canShowWrong(element) {
        return element.invalid && element.errors.wrongPassword;
    }
}
