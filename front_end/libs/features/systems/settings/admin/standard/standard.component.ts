import {
    Component,
    OnInit,
    Input,
    ViewChild,
    ElementRef,
    OnChanges,
    OnDestroy,
} from '@angular/core';
import { NgForm } from '@angular/forms';
import { UntilDestroy } from '@ngneat/until-destroy';
import { firstValueFrom } from 'rxjs';

import type { DropdownItem } from '@components/dropdowns/generic/dropdown.component.types';
import { NxDialogsService } from '@dialogs/dialogs.service';
import { environment } from '@environments/environment';
import staticLang from '@language_static';
import { NxMenuService } from '@menu/menu.service';
import { NxAccountService } from '@services/account.service';
import { NxApplyService } from '@services/apply.service';
import { FormWatcher } from '@services/apply.service/watcher';
import type { IConfig } from '@services/nx-config/config-types';
import { NxConfigService } from '@services/nx-config/nx-config.service';
import { NxProcessService } from '@services/process.service';
import { Process } from '@services/process.service/process';
import { NxSystemRestAPI3 } from '@services/system-rest-api-v3.service';
import type { NxSystem } from '@services/system.service/system';
import { NxSystemsService } from '@services/systems.service';
import { icons, menus } from '@static-variables';
import { NgChanges } from '@utils/ng-changes';

const HR_MINS = 60;
const DAY_HRS = 24;
const DAY_MINS = HR_MINS * DAY_HRS;

type LimitSessionTimeUnit = 'days' | 'hours' | 'minutes';
interface LimitSessionTimeItem extends DropdownItem<LimitSessionTimeUnit> {
    id: number;
    max: number;
    default?: number;
}

@UntilDestroy()
@Component({
    selector: 'nx-system-standard-admin-component',
    templateUrl: 'standard.component.html',
    styleUrls: ['standard.component.scss'],
})
export class NxSystemStandardAdminComponent implements OnInit, OnChanges, OnDestroy {
    @Input() settings;
    @Input() system: NxSystem;

    CONFIG: IConfig;
    readonly environment = environment;
    LANG = staticLang;

    selectedTimeUnit: LimitSessionTimeItem;
    sessionLimitToggle: boolean;
    sessionLimitValue: number;
    currentMaxTimeUnit: number;
    saveSettings: Process;
    setWarningMessageThroughApplyService: () => void;
    selectElement;

    is2faDialogActive: boolean;
    system2faEnabled = false;
    settingsWatchersSet = false;
    canChange2fa = false;
    canEditSecurity = false;

    systemAndSecuritySettings = {
        autoDiscoveryEnabled: false,
        statisticsAllowed: false,
        cameraSettingsOptimization: false,
        auditTrailEnabled: false,
        trafficEncryptionForced: false,
        videoTrafficEncryptionForced: false,
        sessionLimitMinutes: 0,
    };

    limitSessionTimeUnits: Record<LimitSessionTimeUnit, LimitSessionTimeItem> = {
        days: {
            value: 'days',
            name: this.LANG.system.settings.sessionLimitDuration.days,
            id: 1,
            max: 999999,
            default: 30,
        },
        hours: {
            value: 'hours',
            name: this.LANG.system.settings.sessionLimitDuration.hours,
            id: 2,
            max: 999999,
        },
        minutes: {
            value: 'minutes',
            name: this.LANG.system.settings.sessionLimitDuration.minutes,
            id: 3,
            max: 999999,
        },
    };

    limitSessionTimeItems: LimitSessionTimeItem[] = [...Object.values(this.limitSessionTimeUnits)];

    icons = icons;

    systemAndSecuritySettingsFormWatcher: FormWatcher;

    @ViewChild('systemAndSecuritySettingsForm', { read: NgForm })
    systemAndSecuritySettingsForm: NgForm;

    @ViewChild('selectorTracker') set selectEle(el: ElementRef) {
        if (el) {
            this.selectElement = el;
        }
    }

    constructor(
        configService: NxConfigService,
        private applyService: NxApplyService,
        private dialogService: NxDialogsService,
        private menuService: NxMenuService,
        private processService: NxProcessService,
        private systemsService: NxSystemsService,
        private accountService: NxAccountService,
    ) {
        this.CONFIG = configService.getConfig();
    }

    DAY_MINS = DAY_MINS; // For template access

    ngOnInit(): void {
        this.menuService.selectedSection$$.set(menus.systemSettings.admin.id);
        this.menuService.selectedDetailsSection$$.set(menus.systemSettings.general.id);
        this.initProcess();

        this.system2faEnabled =
            this.systemsService.systems.find(system => system.id === this.system.id)
                ?.system2faEnabled || false;
        this.checkEditSecurity();
    }

    ngOnChanges(changes: NgChanges<NxSystemStandardAdminComponent>): void {
        if (changes.settings && this.system.isOnline) {
            const { previousValue, currentValue, firstChange } = changes.settings;
            if (
                (JSON.stringify(previousValue) !== JSON.stringify(currentValue) ||
                    !this.settingsWatchersSet) &&
                (!previousValue || firstChange) &&
                !this.applyService.locked
            ) {
                if (currentValue && Object.keys(currentValue).length) {
                    this.setValues(currentValue);
                }
            }
        }
    }

    ngOnDestroy(): void {
        this.applyService.removeWatchers();
    }

    setValues(settings): void {
        if (this.systemAndSecuritySettingsFormWatcher) {
            this.applyService.removeFormWatcher('systemAndSecuritySettingsForm');
        }
        const sw = this.systemAndSecuritySettings;
        const useRest = this.system.useRest;
        Object.keys(sw).forEach(setting => {
            let curr = settings[setting];
            if (!useRest) {
                if (isNaN(curr)) {
                    curr = curr === 'true';
                } else {
                    curr = parseInt(curr);
                }
            }
            sw[setting] = curr;
        });
        this.sessionLimitToggle = Boolean(sw.sessionLimitMinutes);
        this.selectedTimeUnit = this.limitSessionTimeUnits.minutes;
        this.updateTimeUnitInput(this.selectedTimeUnit);
        this.sessionLimitValue = sw.sessionLimitMinutes;
        this.divideTimeValue(this.sessionLimitValue);
        this.settingsWatchersSet = true;

        setTimeout(() => {
            this.systemAndSecuritySettingsFormWatcher = this.applyService.createFormWatcher(
                'systemAndSecuritySettingsForm',
                this.systemAndSecuritySettingsForm,
                this.saveSettings,
                () => {
                    if (this.systemAndSecuritySettings.sessionLimitMinutes) {
                        this.sessionLimitToggle = true;
                        this.selectedTimeUnit = this.limitSessionTimeUnits.minutes;
                        this.updateTimeUnitInput(this.selectedTimeUnit);
                        this.sessionLimitValue = this.systemAndSecuritySettings.sessionLimitMinutes;
                        this.divideTimeValue(this.sessionLimitValue);
                    } else {
                        this.sessionLimitToggle = false;
                    }
                },
            );
        });
    }

    private updateSettings() {
        const sw = this.systemAndSecuritySettings;
        // handle sessionLimitMinutes when saving an empty value
        if (this.sessionLimitValue === null || this.sessionLimitValue === 0) {
            this.sessionLimitToggle = false;
            sw.sessionLimitMinutes = 0;
        } else {
            this.divideTimeValue(sw.sessionLimitMinutes);
        }
        const changes = { ...sw };

        return firstValueFrom(this.system.updateOrGetSystemSettings(changes));
    }

    checkEditSecurity(): void {
        if (this.system.mediaserver instanceof NxSystemRestAPI3) {
            if (this.system.permissionManager.isOwner$$()) {
                this.canEditSecurity = true;
            } else {
                this.system.mediaserver
                    .powerUserCanEditSecuritySettings()
                    .subscribe({ next: res => (this.canEditSecurity = res) });
            }
        } else {
            this.canEditSecurity = true;
        }
    }

    initProcess(): void {
        this.setWarningMessageThroughApplyService = () => {
            if (this.systemAndSecuritySettings.videoTrafficEncryptionForced) {
                this.applyService.setWarn(
                    this.LANG.system.settings.warningMessages.videoEncryption,
                );
            } else {
                this.applyService.setWarn('');
            }
        };

        this.saveSettings = this.processService.createProcess(() => {
            return this.updateSettings();
        });
    }

    divideTimeValue(minutesValue: number): void {
        if (minutesValue % DAY_MINS === 0) {
            // Whole days
            this.sessionLimitValue = minutesValue / DAY_MINS;
            this.selectedTimeUnit = this.limitSessionTimeUnits.days;
        } else if (minutesValue % HR_MINS === 0) {
            // Whole hours
            this.sessionLimitValue = minutesValue / HR_MINS;
            this.selectedTimeUnit = this.limitSessionTimeUnits.hours;
        }
    }

    // sets input max value and updates hour/minutes
    updateTimeUnitInput(timeUnit: LimitSessionTimeItem): void {
        this.currentMaxTimeUnit = timeUnit.max;

        if (this.selectedTimeUnit.value !== timeUnit.value) {
            this.selectedTimeUnit = timeUnit;
            this.updateSessionLimitValue(this.sessionLimitValue);
        }
    }

    updateSessionLimitValue(newTimeValue: number): void {
        const sw = this.systemAndSecuritySettings;
        if (this.selectedTimeUnit.value === 'days') {
            sw.sessionLimitMinutes = newTimeValue * DAY_MINS;
        } else if (this.selectedTimeUnit.value === 'hours') {
            sw.sessionLimitMinutes = newTimeValue * HR_MINS;
        } else {
            sw.sessionLimitMinutes = newTimeValue;
        }
        this.sessionLimitValue = newTimeValue;
    }

    // handles showing default value on open and clearing to 0 on close
    handleSessionLimitToggle(): void {
        if (this.sessionLimitToggle) {
            if (!this.sessionLimitValue) {
                // prevent overwriting current value with default (in case of late init of the checkbox)
                this.selectedTimeUnit = this.limitSessionTimeUnits.days;
                this.sessionLimitValue = this.selectedTimeUnit.default || 0;
                this.systemAndSecuritySettings.sessionLimitMinutes =
                    (this.selectedTimeUnit.default || 0) * DAY_MINS;
                this.updateTimeUnitInput(this.selectedTimeUnit);
            } else {
                this.updateSessionLimitValue(this.sessionLimitValue);
            }
        } else {
            this.systemAndSecuritySettings.sessionLimitMinutes = 0;
        }
    }

    // handle mandatory 2fa
    async handleMandatory2fa(event: MouseEvent): Promise<void> {
        event.preventDefault();

        if (this.is2faDialogActive) {
            return;
        } else {
            this.is2faDialogActive = true;
        }

        if (this.accountService.account.totpExistsForAccount) {
            this.dialogService
                .toggleSystem2fa({ system: this.system, system2faEnabled: this.system2faEnabled })
                .then(res => {
                    if (res) {
                        this.system2faEnabled = !this.system2faEnabled;
                    }
                    this.is2faDialogActive = false;
                });
        } else {
            this.dialogService.cantEnableSystem2fa().then(() => {
                this.is2faDialogActive = false;
            });
        }
    }
}
