import {
    Component,
    EventEmitter,
    Input,
    OnInit,
    Output,
    OnChanges,
    ViewChild,
} from '@angular/core';
import { NgModel } from '@angular/forms';
import { TranslateService } from '@ngx-translate/core';

import staticLang from '@common/language/language_i18n_static.json';
import { IBool, CoercedBoolInput } from '@decorators/ibool';
import { Process } from '@services/process.service/process';
import { ModuleInformation } from '@services/system-api.types';
import { NxSystem } from '@services/system.service/system';
import { NgChanges } from '@utils/ng-changes';

import type {
    MergeStateType,
    MergeSystem,
    MergeDropdownItem,
} from '../merge.refactor.component.types';

@Component({
    selector: 'nx-merge-select-system-component',
    templateUrl: 'select-system.component.html',
    styleUrls: ['select-system.component.scss'],
})
export class NxMergeSelectSystemComponent implements OnInit, OnChanges {
    LANG = staticLang;

    @Input() selectSystemProcess: Process;
    @Input() mergeSystems: MergeSystem[];
    @Input() system: NxSystem;
    @IBool() @Input() isLocal: CoercedBoolInput;
    @Input() cloudHost: string;
    @Input() targetSystem: MergeSystem;
    @Output() targetSystemChange = new EventEmitter<MergeSystem>();
    @IBool() @Input() otherSystem: CoercedBoolInput;
    @Output() otherSystemChange = new EventEmitter<boolean>();
    @Input() serverUrl: string;
    @Output() serverUrlChange = new EventEmitter<string>();
    @Input() cleanUpUrl: (serverUrl: string) => string;
    @Input() existingSystems: { [ip: string]: string };
    @IBool() @Input() checking: CoercedBoolInput;
    @IBool() @Input() checkedOnce: CoercedBoolInput;
    @IBool() @Input() noOtherSystems: CoercedBoolInput;
    @Input() getSystemInfo: (systemId: string) => Promise<ModuleInformation>;
    @Input() errorCode: string;
    @Output() setCurrentState = new EventEmitter<MergeStateType>();
    @ViewChild('serverUrlInput', { static: false }) serverUrlInputElement: NgModel;

    // class variables
    processedSystems: MergeDropdownItem[];
    systemsProcessed = false;
    selectedSystem: MergeDropdownItem;
    downloadHTML: string;
    currentSystemName: string;

    // text variables
    bodyTitle: string;
    helpText: string;
    checkMergeButtonText: string;
    serverUrlInput: string;
    serverUrlInputValue: string;
    serverUrlInputValidationText: string;
    serverUrlInputValidationErrorText: string;
    checkingErrorText: string;

    constructor(private translateService: TranslateService) {}

    ti(stringToBeTranslated: string, systemName?: string): string {
        return this.translateService.instant(stringToBeTranslated, {
            primarySystem: this.currentSystemName,
            secondarySystem: systemName,
            targetSystem: systemName,
            downloadHTML: this.downloadHTML,
        });
    }

    ngOnInit(): void {
        this.currentSystemName = this.system.info.name;
        this.checkMergeButtonText = this.ti(this.LANG.dialogs.merge.next);

        // TODO: confirm that downloadHTML button works
        const latestBuild = this.ti(this.LANG.dialogs.merge.latestBuild);
        this.downloadHTML = `<span>${latestBuild}</span>`;
        if (this.cloudHost) {
            this.downloadHTML = `<a href=\"${
                this.isLocal ? this.cloudHost : ''
            }/download" target=\"_blank\">${latestBuild}</a>`;
        }

        if (this.noOtherSystems) {
            this.selectedSystem = {
                name: 'noOtherSystem',
                value: 'noOtherSystem',
                status: '',
            };
        } else {
            this.processedSystems = this.processSystems(this.mergeSystems);
            this.setTargetSystem(this.selectInitialSystem());
        }

        this.systemsProcessed = true;
    }

    ngOnChanges(changes: NgChanges<NxMergeSelectSystemComponent>): void {
        if (changes.mergeSystems?.currentValue && changes.mergeSystems.previousValue) {
            this.systemsProcessed = false;
            this.processedSystems = this.processSystems(changes.mergeSystems.currentValue);
            this.systemsProcessed = true;
        }

        if (changes.checkedOnce?.currentValue) {
            this.checkMergeButtonText = this.ti(this.LANG.dialogs.merge.check);
        }

        if (changes.errorCode?.currentValue) {
            this.updateErrorMessage(changes.errorCode.currentValue);
        }
    }

    processSystems(systems: MergeSystem[]): MergeDropdownItem[] {
        const statusIncompatible = ` – ${this.ti(this.LANG.systemStatuses.incompatible)}`;
        const statusUnavailable = ` – ${this.ti(this.LANG.systemStatuses.unavailable)}`;
        const statusOffline = ` – ${this.ti(this.LANG.systemStatuses.offline)}`;
        const statusCloud = ` – ${this.ti(this.LANG.dialogs.merge.cloud)}`;

        const processedSystems: MergeDropdownItem[] = systems.map(
            ({
                id,
                name,
                stateOfHealth,
                protoVersion,
                canMerge,
                cloudSystemId,
                url,
            }: MergeSystem) => {
                let help: string = '';
                let status: string = '';
                if (
                    protoVersion &&
                    protoVersion !== this.system.serverManager.moduleInfo.protoVersion
                ) {
                    stateOfHealth = 'incompatible';
                }

                switch (stateOfHealth) {
                    case 'online':
                    case 'unauthorized':
                        break;
                    case 'offline':
                        help = statusOffline;
                        status = this.ti(this.LANG.dialogs.merge.systemOffline, name);
                        break;
                    case 'incompatible':
                        help = statusIncompatible;
                        status = this.ti(this.LANG.dialogs.merge.systemsIncompatible);
                        break;
                    default:
                        help = statusUnavailable;
                        status = this.ti(this.LANG.dialogs.merge.secondarySystemUnavailable, name);
                }

                if (!status && typeof canMerge === 'boolean' && !canMerge) {
                    help = statusIncompatible;
                    status = this.ti(this.LANG.dialogs.merge.secondaryCannotMerge, name);
                }

                if (this.isLocal) {
                    if (cloudSystemId) {
                        // doesn't catch when current system is a local system
                        if (this.system.serverManager?.moduleInfo.cloudSystemId) {
                            status = name
                                ? this.ti(
                                      this.LANG.dialogs.merge.knownBothSystemsConnectedToCloud,
                                      name,
                                  )
                                : this.ti(
                                      this.LANG.dialogs.merge.unknownBothSystemsConnectedToCloud,
                                  );
                        }
                        if (!help) {
                            help = statusCloud;
                        }
                    }
                    help = ` (${name}, ${url}) ${help}`;
                }

                if (!this.system.canMerge) {
                    status = this.ti(this.LANG.dialogs.merge.primaryCannotMerge, name);
                }
                if (!this.system.isOnline) {
                    status = this.ti(this.LANG.dialogs.merge.primarySystemOffline, name);
                }
                if (!this.system.isAvailable) {
                    status = this.ti(this.LANG.dialogs.merge.primarySystemUnavailable);
                }

                return {
                    value: id,
                    name,
                    help,
                    status,
                    url,
                    isMergeable: !status,
                };
            },
        );

        if (this.isLocal) {
            processedSystems.push(
                { value: undefined, name: 'horizontal' },
                { value: 'otherSystem', name: this.ti(this.LANG.dialogs.merge.otherSystem) },
            );
        }

        return processedSystems;
    }

    updateErrorMessage(errorKey: string): void {
        if (['systemVersionOld', 'systemVersionNew', 'systemsIncompatible'].includes(errorKey)) {
            errorKey = this.isLocal ? 'systemsIncompatible' : 'systemVersionsNotMatch';
        }
        if (!errorKey) {
            errorKey = 'unknownError';
        }
        this.selectedSystem.status = this.ti(
            this.LANG.dialogs.merge[errorKey],
            this.targetSystem?.name,
        );
    }

    selectInitialSystem(): MergeDropdownItem {
        let firstSystemWithNoErrorStatus: MergeDropdownItem;
        for (const system of this.processedSystems) {
            // handles case where user comes back to select system screen
            if (this.targetSystem) {
                if (this.targetSystem.id === system.value) {
                    return system;
                } else if (!firstSystemWithNoErrorStatus && system.status === '') {
                    firstSystemWithNoErrorStatus = system;
                }
            } else if (system.status === '') {
                return system;
            }
        }
        return firstSystemWithNoErrorStatus || this.processedSystems[0];
    }

    /**
     * always change selectedSystem + set process button to "next"
     * cloud systems: targetSystem.emit to parent
     * local peer: serverUrl.emit + targetSystem.emit to parent
     * other system selected in dropdown: otherSystem.emit + set serverUrl to ''
     * other system auto-changed from input change: otherSystem.emit
     */
    async setTargetSystem(selectedSystem: MergeDropdownItem): Promise<void> {
        // TODO: probably need to add the top part of the original setTargetSystem in about canceling process service
        // gets triggered for peer discovered only (not cloud or other systems)
        if (selectedSystem.url) {
            this.serverUrlInputValidationErrorText = undefined;
            this.serverUrlChange.emit(selectedSystem.url);
        }

        if (selectedSystem.value.includes('otherSystem')) {
            this.serverUrlInputValidationErrorText = undefined;
            this.otherSystemChange.emit(true);
            if (!selectedSystem.value.includes('AutoChange')) {
                this.serverUrlChange.emit('');
            }
        } else {
            let targetSystem: MergeSystem;
            if (!this.isLocal) {
                const systemModuleInfo: ModuleInformation = await this.getSystemInfo(
                    selectedSystem.value,
                );
                for (const system of this.mergeSystems) {
                    if (system.id === selectedSystem.value) {
                        system.protoVersion = systemModuleInfo.reply.protoVersion;
                        targetSystem = system;
                        break;
                    }
                }
                this.processSystems(this.mergeSystems);
            }
            if (!targetSystem) {
                targetSystem = this.mergeSystems.find(
                    (s: MergeSystem) => selectedSystem.name === s.name,
                );
            }
            this.targetSystemChange.emit(targetSystem);
        }

        this.selectedSystem = selectedSystem;
        this.checkMergeButtonText = this.ti(this.LANG.dialogs.merge.next);
    }

    serverUrlUpdate(input: NgModel): void {
        // handles changing auto-discovered to Other System if url changed
        if (!this.selectedSystem?.value.includes('otherSystem') && this.serverUrl !== input.value) {
            this.setTargetSystem({
                value: 'otherSystemAutoChange',
                name: this.ti(this.LANG.dialogs.merge.otherSystem),
            });
        }
        this.serverUrlChange.emit(input.value);
        if (input.touched && input.errors?.required) {
            this.serverUrlInputValidationErrorText = this.ti(this.LANG.dialogs.merge.urlEmpty);
        } else if (input.errors?.forbiddenUrl && (input.touched || !input.errors?.required)) {
            this.serverUrlInputValidationErrorText = this.ti(this.LANG.dialogs.merge.urlNotValid);
        } else {
            this.serverUrlInputValidationErrorText = undefined;
        }
    }

    checkMergeabilityFunction(err?: string): void {
        if (this.otherSystem) {
            this.checkIfExistingSystem(this.cleanUpUrl(this.serverUrl));
        }
        if (this.serverUrl) {
            this.serverUrlUpdate(this.serverUrlInputElement);
        }
        if (err === 'HttpErrorResponse') {
            this.serverUrlInputValidationErrorText = this.ti(this.LANG.dialogs.merge.urlNotValid);
        }
    }

    checkIfExistingSystem(url: string): void {
        // if using otherSystem, checks if it matches an existing system in dropdown
        if (url && /^https?:\/\//.test(url)) {
            url = url.slice(url.indexOf('://') + 3);
        }
        if (this.existingSystems[url]) {
            this.setTargetSystem(
                this.processedSystems.find(
                    (item: MergeDropdownItem) => item.value === this.existingSystems[url],
                ),
            );
        }
    }

    // setTargetSystem(targetSystem, serverUrlInputValue = ''): void {
    //     // cancels process service if new system selected while checking
    //     if (this.checkMergeabilityProcess.processing && !this.systemUpdating) {
    //         this.checkMergeabilityProcess.processing = false;
    //         this.checkMergeabilityProcess.finished = true;
    //         this.checking = false;
    //         this.setTargetSystem(targetSystem, serverUrlInputValue);
    //     } else {
    //         let showUpdate = this.checkMergeDefault;
    //         const templateUpdates: any = {};
    //         if (targetSystem.value === this.otherSystem) {
    //             this.targetSystemDropdown = { value: this.otherSystem, name: this.LANG.dialogs.merge.otherSystem };
    //             this.targetSystem = targetSystem;
    //             showUpdate = this.serverUrlState;
    //             Object.assign(templateUpdates, { serverUrlInputValue, selectedTarget: this.otherSystem });
    //         } else {
    //             this.targetSystem = this.systemsWithInfo.find(system => system.id === targetSystem.value) ||
    //                 this.peerSystems.find(system => system.id === targetSystem.value);
    //             this.targetSystem.value = this.targetSystem.id;
    //             this.targetSystemDropdown = this.makeSelectorList([this.targetSystem])[0];
    //             this.systemMergeable = this.checkMergeability(this.targetSystem);
    //             Object.assign(templateUpdates, {
    //                 helpText: this.LANG.dialogs.merge.ownerCanMergeText,
    //                 selectedTarget: this.targetSystem.value
    //             });

    //             if (this.targetSystem.systemName) {
    //                 showUpdate = this.serverUrlState;
    //                 templateUpdates.serverUrlInputValue = this.targetSystem.url;
    //                 delete templateUpdates.helpText;
    //             }
    //             if (this.systemMergeable) {
    //                 showUpdate = this.targetSystem.systemName ? this.serverUrlMergeError : this.checkMergeError;
    //                 templateUpdates.checkingErrorText = this.systemMergeable;
    //                 delete templateUpdates.helpText;
    //             }
    //         }
    //         this.setSystems();
    //         this.updateShow(showUpdate, templateUpdates);
    //         setTimeout(() => {
    //             if (this.machine.state.show.serverUrlInput) {
    //                 this.serverUrlInputFocus.nativeElement.focus();
    //             }
    //         });
    //     }
    // }
}
