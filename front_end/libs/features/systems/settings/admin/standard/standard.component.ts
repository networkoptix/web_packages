import {
    Component,
    OnInit,
    Input,
    ViewChild,
    ElementRef,
    OnChanges,
    OnDestroy
} from '@angular/core';
import { NgForm } from '@angular/forms';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { firstValueFrom } from 'rxjs';
import { catchError, map, switchMap, tap } from 'rxjs/operators';

import { NxMenuService } from '@app/menu/menu.service';
import staticLang from '@common/language/language_i18n_static.json';
import type {
    DropdownItem
} from '@components/dropdowns/generic/dropdown.component.types';
import { NxDialogsService } from '@dialogs/dialogs.service';
import { environment } from '@environments/environment';
import { icons, menus } from '@lib/variables/static-variables';
import { NxApplyService } from '@services/apply.service';
import { FormWatcher } from '@services/apply.service/watcher';
import { NxCloudApiService } from '@services/nx-cloud-api';
import { CustomAccountProperty } from '@services/nx-cloud-api/custom-account-property';
import type { IConfig } from '@services/nx-config/config-types';
import { NxConfigService } from '@services/nx-config/nx-config.service';
import { NxProcessService } from '@services/process.service';
import { Process } from '@services/process.service/process';
import type { NxSystem } from '@services/system.service/system';
import { NxSystemsService } from '@services/systems.service';
import { delayInitial } from '@utils/general';
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

class AlexaSettings {
    static CUSTOM_PROPERTY_ENDPOINT = 'alexa';

    constructor(
        public enabled = false,
        public selectedSystem: string = null,
        public accountLinked = false,
        public eventRulesSetup = false
    ) {}

    static clean = selectedSystem =>
        input => new AlexaSettings(
            input.enabled || false,
            input.selectedSystem || selectedSystem,
            input.accountLinked || false,
            input.eventRulesSetup || false
        );

    static cleanObservable = selectedSystem => map(
        AlexaSettings.clean(selectedSystem),
        AlexaSettings.clean(selectedSystem)
    );
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

    alexaSettingsCustomProperty: CustomAccountProperty<Partial<AlexaSettings>>;

    selectedTimeUnit: LimitSessionTimeItem;
    sessionLimitToggle: boolean;
    timeValue: number;
    currentMaxTimeUnit: number;
    previousInputValue: number;
    saveSettings: Process;
    setWarningMessageThroughApplyService: () => void;
    selectElement;
    alexaSettings: Partial<AlexaSettings>;
    eventRulesBeingSetup = false;

    is2faDialogActive: boolean;
    system2faEnabled = false;
    settingsWatchersSet = false;
    canChange2fa = false;

    systemAndSecuritySettings = {
        autoDiscoveryEnabled: false,
        statisticsAllowed: false,
        cameraSettingsOptimization: false,
        auditTrailEnabled: false,
        trafficEncryptionForced: false,
        videoTrafficEncryptionForced: false,
        sessionLimitMinutes: 0
    };

    limitSessionTimeUnits: Record<LimitSessionTimeUnit, LimitSessionTimeItem> = {
        days: {
            value: 'days',
            name: this.LANG.system.settings.sessionLimitDuration.days,
            id: 1,
            max: 999999,
            default: 30
        },
        hours: {
            value: 'hours',
            name: this.LANG.system.settings.sessionLimitDuration.hours,
            id: 2,
            max: 999999
        },
        minutes: {
            value: 'minutes',
            name: this.LANG.system.settings.sessionLimitDuration.minutes,
            id: 3,
            max: 999999
        }
    };

    limitSessionTimeItems: LimitSessionTimeItem[] = [...Object.values(this.limitSessionTimeUnits)];

    icons = icons;

    systemAndSecuritySettingsFormWatcher: FormWatcher;

    @ViewChild('systemAndSecuritySettingsForm', { read: NgForm }) systemAndSecuritySettingsForm: NgForm;

    @ViewChild('selectorTracker') set selectEle(el: ElementRef) {
        if (el) {
            this.selectElement = el;
        }
    }

    constructor(
        configService: NxConfigService,
        private applyService: NxApplyService,
        private cloudApi: NxCloudApiService,
        private dialogService: NxDialogsService,
        private menuService: NxMenuService,
        private processService: NxProcessService,
        private systemsService: NxSystemsService,
    ) {
        this.CONFIG = configService.getConfig();
        if (this.CONFIG.cloudCapabilities.alexaIntegrationEnabled) {
            this.alexaSettingsCustomProperty = this.cloudApi.customAccountPropertyFactory(AlexaSettings.CUSTOM_PROPERTY_ENDPOINT, new AlexaSettings());
        }
    }

    DAY_MINS = DAY_MINS; // For template access

    ngOnInit(): void {
        this.menuService.section = menus.systemSettings.admin.id;
        this.menuService.detail = menus.systemSettings.general.id;
        this.initProcess();

        if (this.CONFIG.cloudCapabilities.alexaIntegrationEnabled) {
            delayInitial(
                this.alexaSettingsCustomProperty.value$
            )
                .pipe(
                    AlexaSettings.cleanObservable(this.system.id),
                    switchMap(this.#syncEventRulesSetup),
                    untilDestroyed(this)
                ).subscribe(
                    settings => {
                        this.alexaSettings = settings;
                    },
                    _ => {
                        this.alexaSettings = {};
                    }
                );
        }

        this.system2faEnabled = this.systemsService.systems
            .find(system => system.id === this.system.id)?.system2faEnabled;
    }

    ngOnChanges(changes: NgChanges<NxSystemStandardAdminComponent>): void {
        if (changes.settings && this.system.isOnline) {
            const { previousValue, currentValue, firstChange } = changes.settings;
            if (
                (JSON.stringify(previousValue) !== JSON.stringify(currentValue) ||
                    !this.settingsWatchersSet) && (!previousValue || firstChange) && !this.applyService.locked
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
        this.systemAndSecuritySettingsFormWatcher &&
            this.applyService.removeFormWatcher('systemAndSecuritySettingsForm');
        const sw = this.systemAndSecuritySettings;
        Object.keys(sw).forEach(setting => {
            let curr = settings[setting];
            if (curr) {
                /**
                 * sets initial values for system & security settings
                 * sessionLimitMinutes is the only one that's a number & not a boolean,
                 * so it needs custom code to handle
                 */
                if (isNaN(curr)) {
                    sw[setting] = curr === 'true';
                } else if (this.limitSessionTimeUnits) {
                    curr = parseInt(curr);
                    this.sessionLimitToggle = Boolean(curr);
                    this.selectedTimeUnit = this.limitSessionTimeUnits.minutes;
                    this.updateTimeUnitInput(this.selectedTimeUnit);
                    sw[setting] = curr;
                    this.timeValue = curr;
                    this.divideTimeValue(this.timeValue);
                }
            }
        });
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
                        this.timeValue = this.systemAndSecuritySettings.sessionLimitMinutes;
                        this.divideTimeValue(this.timeValue);
                    } else {
                        this.sessionLimitToggle = false;
                    }
                });
        });
    }

    private updateSettings() {
        const sw = this.systemAndSecuritySettings;
        // handle sessionLimitMinutes when saving an empty value
        if (this.timeValue === null || this.timeValue === 0) {
            this.sessionLimitToggle = false;
            sw.sessionLimitMinutes = 0;
        } else {
            this.divideTimeValue(sw.sessionLimitMinutes);
        }
        const changes = { ...sw };

        return firstValueFrom(this.system.updateOrGetSystemSettings(changes));
    }

    initProcess(): void {
        this.setWarningMessageThroughApplyService = () => {
            if (this.systemAndSecuritySettings.videoTrafficEncryptionForced) {
                this.applyService.setWarn(
                    this.LANG.system.settings.warningMessages.videoEncryption
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
        if (minutesValue % DAY_MINS === 0) { // Whole days
            this.timeValue = minutesValue / DAY_MINS;
            this.selectedTimeUnit = this.limitSessionTimeUnits.days;
        } else if (minutesValue % HR_MINS === 0) { // Whole hours
            this.timeValue = minutesValue / HR_MINS;
            this.selectedTimeUnit = this.limitSessionTimeUnits.hours;
        }
    }

    // sets input max value and updates hour/minutes
    updateTimeUnitInput(timeUnit: LimitSessionTimeItem): void {
        this.currentMaxTimeUnit = timeUnit.max;

        if (this.selectedTimeUnit.value !== timeUnit.value) {
            this.selectedTimeUnit = timeUnit;
            this.updateLimitSessionValue(this.timeValue);
        }
    }

    updateLimitSessionValue(newTimeValue: number): void {
        const sw = this.systemAndSecuritySettings;
        if (this.selectedTimeUnit.value === 'days') {
            sw.sessionLimitMinutes = newTimeValue * DAY_MINS;
        } else if (this.selectedTimeUnit.value === 'hours') {
            sw.sessionLimitMinutes = newTimeValue * HR_MINS;
        } else {
            sw.sessionLimitMinutes = newTimeValue;
        }
        this.timeValue = newTimeValue;
    }

    // handles showing default value on open and clearing to 0 on close
    handleSessionLimitToggle(): void {
        if (this.sessionLimitToggle) {
            if (!this.timeValue) { // prevent overwriting current value with default (in case of late init of the checkbox)
                this.selectedTimeUnit = this.limitSessionTimeUnits.days;
                this.timeValue = this.selectedTimeUnit.default;
                this.systemAndSecuritySettings.sessionLimitMinutes =
                    this.selectedTimeUnit.default * DAY_MINS;
                this.updateTimeUnitInput(this.selectedTimeUnit);
            }
        } else {
            this.timeValue = 0;
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

        this.dialogService
            .toggleSystem2fa({ system: this.system, system2faEnabled: this.system2faEnabled })
            .then(res => {
                if (res) {
                    this.system2faEnabled = !this.system2faEnabled;
                }
            }).finally(() => {
                this.is2faDialogActive = false;
            });
    }

    // Alexa Methods
    updateEventRules = (settings = { enabled: true }) => {
        this.eventRulesBeingSetup = settings.enabled;
        return delayInitial(this.system.updateAlexaRules(settings.enabled))
            .pipe(
                catchError(error => {
                    console.error(error);
                    return delayInitial(Promise.resolve(false));
                }),
                tap(setup => {
                    if (settings.enabled) {
                        this.alexaSettings = settings;
                        this.alexaSettings.eventRulesSetup = !!setup && settings.enabled;
                    }
                    this.eventRulesBeingSetup = false;
                    this.alexaSettingsCustomProperty.save(this.alexaSettings, true);
                })
            ).toPromise();
    };

    #syncEventRulesSetup = (settings: Partial<AlexaSettings>) => {
        return this.system.mediaserver.getEventRules().pipe(
            switchMap(async rules => {
                const checkCommand = (command: string) => rules.find(rule => {
                    const condition = JSON.parse(rule.eventCondition);
                    const resourceName = condition.resourceName;
                    return resourceName === command;
                });
                const currentUserEmail = this.system.userManager.currentUser.email;
                const layoutCommand = `"Alexa layout command for ${currentUserEmail}"`;
                const customCommand = `"Alexa command for ${currentUserEmail}"`;
                const rulesSetup = !!checkCommand(layoutCommand) && !!checkCommand(customCommand);
                if (settings.eventRulesSetup !== rulesSetup) {
                    settings.eventRulesSetup = rulesSetup;
                    await this.alexaSettingsCustomProperty.save(settings, true);
                }
                return settings;
            }));
    };

    #updateAlexa = (settings: Partial<AlexaSettings>) =>
        this.CONFIG.cloudCapabilities.alexaIntegrationEnabled && delayInitial(
            this.alexaSettingsCustomProperty.save(settings)
        ).pipe(
            tap(settings => {
                this.alexaSettings = settings;
            }),
            switchMap(this.updateEventRules),
            map(setup => ({ ...settings, eventRulesSetup: !!setup })),
            untilDestroyed(this)
        ).subscribe(settings => {
            this.alexaSettings = settings;
            this.alexaSettingsCustomProperty.save(this.alexaSettings, true);
        });

    toggleAlexaEnabled = (): void => {
        const {
            enabled,
            // selectedSystem,
            accountLinked = false,
            eventRulesSetup = false
        } = this.alexaSettings;
        this.alexaSettings = null;
        this.#updateAlexa(enabled ? {
            enabled: false,
            accountLinked
        } : {
            enabled: true,
            accountLinked,
            eventRulesSetup,
            selectedSystem: this.system.id
        });
    };

    toggleSystemSelected = () => {
        if (this.alexaSettings.selectedSystem === this.system.id) {
            return;
        }
        const {
            enabled,
            accountLinked = false,
            eventRulesSetup = false
        } = this.alexaSettings;
        this.alexaSettings = null;
        this.#updateAlexa({
            enabled,
            accountLinked,
            eventRulesSetup,
            selectedSystem:
                this.system.id
        });
    };
}
