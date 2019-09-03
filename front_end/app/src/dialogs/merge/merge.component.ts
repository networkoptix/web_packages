import { Component, Input, Renderer2, ViewChild } from '@angular/core';
import { NgbActiveModal }            from '@ng-bootstrap/ng-bootstrap';
import { NxConfigService }           from '../../services/nx-config';
import { NxCloudApiService }         from '../../services/nx-cloud-api';
import { NxLanguageProviderService } from '../../services/nx-language-provider';
import { NxProcessService }          from '../../services/process.service';
import { NxSystemService }           from '../../services/system.service';
import { NxSystemsService }          from '../../services/systems.service';

@Component({
    selector   : 'nx-modal-merge-content',
    templateUrl: 'merge.component.html',
    styleUrls  : ['merge.component.scss']
})
export class MergeModalContent {
    @Input() system;
    @Input() systems;
    @Input() systemName;
    @Input() closable;
    @Input() user;

    LANG: any;
    checking: boolean;
    checkMergeabilityProcess: any;
    config: any;
    mergingProcess: any;
    multipleSystems: boolean;
    outOfDate: boolean;
    password: string;
    primarySystem: any;
    processedSystems: any;
    secondarySystem: any;
    state: string;
    systemError: boolean;
    systemMergeable: string;
    targetSystem: any;
    targetSystemDropdown: any;
    tooManySystems: boolean;
    wrongPassword: boolean;

    @ViewChild('mergeForm', { static: true }) mergeForm: HTMLFormElement;

    constructor(public activeModal: NgbActiveModal,
                public renderer: Renderer2,
                private configService: NxConfigService,
                private cloudApi: NxCloudApiService,
                private language: NxLanguageProviderService,
                private processService: NxProcessService,
                private systemService: NxSystemService,
                private systemsService: NxSystemsService
    ) {
        this.config = this.configService.getConfig();
        this.checking = false;
        this.state = 'select';
        this.wrongPassword = false;
        this.LANG = this.language.getTranslations();
    }

    ngOnInit() {
        this.primarySystem = this.system;
        this.multipleSystems = this.systems.length > 0;
        this.outOfDate = this.multipleSystems && !this.system.canMerge;
        this.processedSystems = this.makeSelectorList(this.systems);
        this.targetSystem = this.selectDefaultSystem();
        this.secondarySystem = this.targetSystem;
        this.targetSystemDropdown = this.makeSelectorList([this.targetSystem])[0];
        this.systemMergeable = this.checkMergeability(this.targetSystem);
        this.systemError = !this.multipleSystems || this.outOfDate;

        this.initProcesses();
    }

    initProcesses() {
        this.mergingProcess = this.processService.createProcess(() => {
            return this.cloudApi.merge(this.primarySystem.id, this.secondarySystem.id, this.password);
        }, {
            errorCodes: {
                mergedSystemIsOffline: () => {
                    return this.LANG.system.mergeFailed;
                },
                vmsRequestFailure: () => {
                    return this.LANG.system.mergeFailed;
                },
                wrongPassword: () => {
                    this.mergeForm.controls.mergePassword.setErrors({ wrongPassword: true });
                    this.password = '';

                    this.renderer.selectRootElement('#mergePassword').focus();
                    this.wrongPassword = true;
                },
            },
            successMessage: this.LANG.system.mergeStart
        }).then(() => {
            this.systemsService.forceUpdateSystems();
            this.activeModal.close({
                anotherSystemId: this.targetSystem.id,
                role: this.primarySystem.id === this.system.id ?
                    this.configService.config.systemStatuses.master :
                    this.configService.config.systemStatuses.slave
            });
        }, (error) => {
            if (error.data.resultCode !== 'wrongPassword') {
                /* Get the names of the primary and secondary system.
                   Next try to figure out which system caused the problem.
                   If the primary system's stateOfHealth is not online set it as the failedSystem.
                   Otherwise the secondary system is set as the failedSystem no matter what.
                 */
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
            }
        });

        this.checkMergeabilityProcess = this.processService.createProcess(() => {
            this.checking = true;
            this.systemMergeable = '';
            return this.precheckSystemMerge();
        }, { errorCodes: {}})
        .then((res) => {
            this.checking = false;
            this.targetSystemDropdown.name = this.addStatus(this.targetSystem);
            this.systemMergeable = this.checkMergeability(this.targetSystem);
            if (!res.system && this.systemMergeable === '' || this.config.allowDebugMode) {
                return this.updateState();
            }
        });
    }

    addStatus(system) {
        let status = '';
        const statusIncompatible = ` – ${this.LANG.systemStatuses.incompatible}`;
        const statusUnavailable = ` – ${this.LANG.systemStatuses.unavailable}`;
        const statusOffline = ` – ${this.LANG.systemStatuses.offline}`;
        const stateOfHealth = system.info && system.info.stateOfHealth || system.stateOfHealth || system.stateMessage || '';
        switch (stateOfHealth) {
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

        // HTML required for dropdown list
        return `<span>${system.name}</span><span class="text-muted">${status}</span>`;
    }

    // Add system can merge where added to systems form api call
    checkMergeability(system) {
        const stateOfHealth = system.info && system.info.stateOfHealth || system.stateOfHealth || system.stateMessage || '';

        if (system.hasOwnProperty('isOnline') && !system.isOnline || stateOfHealth.indexOf('offline') > -1) {
            return 'offline';
        }
        if (system.hasOwnProperty('isAvailable') && !system.isAvailable || stateOfHealth.indexOf('unavailable') > -1) {
            return 'unavailable';
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
            return 'primaryUnavailable';
        }
        return '';
    }

    precheckSystemMerge() {
        this.targetSystem = this.systemService.createSystem(this.targetSystem.id, this.user.email);
        return this.targetSystem.getUsersDataFromTheSystem().then(() => {
            return Promise.all([
                this.system.mediaserver.getMediaServers().catch(error => {
                    return Promise.reject({system: 'current', errorResponse: error});
                }),
                this.targetSystem.mediaserver.getMediaServers().catch(error => {
                    return Promise.reject({system: 'target', errorResponse: error});
                })
            ]).then(res => {
                this.tooManySystems = res.map(req => req.data.length)
                    .reduce((acc, cur) => acc + cur) > this.config.maxServers;
                return {};
            });
        }, (err) => err);
    }

    makeSelectorList(systems) {
        return systems.map(system => {
            return { id: system.id, name: this.addStatus(system) };
        });
    }

    selectDefaultSystem() {
        if (this.systems.length < 1) {
            console.error('Error User needs to be the owner of more than 1 system');
            return {};
        }
        for (const i in this.systems) {
            if (this.checkMergeability(this.systems[i]) === '') {
                return {...this.systems[i]};
            }
        }
        return {...this.systems[0]};
    }

    setSystems() {
        this.primarySystem = this.primarySystem.id === this.system.id ? this.system : this.targetSystem;
        this.secondarySystem = this.primarySystem.id === this.system.id ? this.targetSystem : this.system;
    }

    setTargetSystem(targetSystem) {
        this.systemMergeable = '';
        this.targetSystem = {... this.systems.find(system => system.id === targetSystem.id)};
        this.setSystems();
    }

    updateState() {
        switch (this.state) {
            case 'select':
                this.state = this.tooManySystems ? 'warning' : 'confirm';
                break;
            case 'warning':
                this.state = 'confirm';
                break;
            default:
                break;
        }
    }
}
