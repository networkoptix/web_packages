import {
    Component, OnInit, Input,
    ViewChild, ElementRef, OnChanges, SimpleChanges
}                                           from '@angular/core';
import {  catchError, map, switchMap, tap }                  from 'rxjs/operators';
import { UntilDestroy, untilDestroyed }     from '@ngneat/until-destroy';

import { NxConfigService, IConfig }  from '@services/nx-config';
import { NxLanguageProviderService } from '@services/nx-language-provider';
import { NxProcessService, Process } from '@services/process.service';
import { NxSystem }                  from '@services/system.service';
import { NxApplyService, Watcher }   from '@services/apply.service';
import { NxMenuService }             from '@src/menu';
import { LanguageI18NStaticTypes }   from '@app/language_i18n_static_types';
import { NxCloudApiService }         from '@services/nx-cloud-api';
import { delayInitial }              from '@services/utils.service';
import { NxDialogsService }          from '@dialogs/dialogs.service';
import { NxSystemsService }          from '@services/systems.service';

const HR_MINS = 60;
const DAY_HRS = 24;
const DAY_MINS = HR_MINS * DAY_HRS;

type LimitSessionTimeUnit = 'days' | 'hours' | 'minutes';
type LimitSessionTimeItem = {
    value: LimitSessionTimeUnit;
    name: string;
    id: number;
    max: number;
    default?: number;
}

class AlexaSettings {
    static CUSTOM_PROPERTY_ENDPOINT = 'alexa'

    constructor(
        public enabled = false,
        public selectedSystem: string = null,
        public accountLinked = false,
        public eventRulesSetup = false
    ) {}

    static clean = (selectedSystem) => (input) => new AlexaSettings(input.enabled || false, input.selectedSystem || selectedSystem, input.accountLinked || false, input.eventRulesSetup || false)

    static cleanObservable = (selectedSystem) => map(AlexaSettings.clean(selectedSystem), AlexaSettings.clean(selectedSystem))
}

@UntilDestroy()
@Component({
    selector: 'nx-system-standard-admin-component',
    templateUrl: 'standard.component.html',
    styleUrls: ['standard.component.scss']
})

export class NxSystemStandardAdminComponent implements OnInit, OnChanges {
    @Input() settings;
    @Input() system: NxSystem;
    CONFIG: IConfig;
    LANG: LanguageI18NStaticTypes;

    selectedTimeUnit: LimitSessionTimeItem;
    sessionLimitToggle: boolean;
    timeValue: number;
    currentMaxTimeUnit: number;
    previousInputValue: number;
    limitSessionTimeUnits: Record<LimitSessionTimeUnit, LimitSessionTimeItem>;
    limitSessionTimeItems: LimitSessionTimeItem[];
    saveSettings: Process;
    setWarningMessageThroughApplyService: () => void;
    selectElement;
    alexaSettings: Partial<AlexaSettings>;
    eventRulesBeingSetup = false;

    is2faDialogActive: Promise<any>;
    system2faEnabled = false;

    settingsWatchersSet = false;
    settingsWatchers = {
        autoDiscoveryEnabled: new Watcher<boolean>(),
        statisticsAllowed: new Watcher<boolean>(),
        cameraSettingsOptimization: new Watcher<boolean>(),
        auditTrailEnabled: new Watcher<boolean>(),
        trafficEncryptionForced: new Watcher<boolean>(),
        videoTrafficEncryptionForced: new Watcher<boolean>(),
        sessionLimitMinutes: new Watcher<number>()
    };

    @ViewChild('selectorTracker') set selectEle(el: ElementRef) {
        if (el) {
            this.selectElement = el;
        }
    }

    constructor(
        configService: NxConfigService,
        language: NxLanguageProviderService,
        private applyService: NxApplyService,
        private cloudApi: NxCloudApiService,
        private dialogService: NxDialogsService,
        private menuService: NxMenuService,
        private processService: NxProcessService,
        private systemsService: NxSystemsService
    ) {
        this.CONFIG = configService.getConfig();
        this.LANG = language.translations;
    }

    DAY_MINS = DAY_MINS // For template access

    ngOnInit(): void {
        this.limitSessionTimeUnits = {
            days: {
                value: 'days',
                name: this.LANG.system.settings.sessionLimitDuration.days(),
                id: 1,
                max: 999999,
                default: 30
            },
            hours: {
                value: 'hours',
                name: this.LANG.system.settings.sessionLimitDuration.hours(),
                id: 2,
                max: 999999
            },
            minutes: {
                value: 'minutes',
                name: this.LANG.system.settings.sessionLimitDuration.minutes(),
                id: 3,
                max: 999999
            }
        };
        this.menuService.section = this.CONFIG.menus.systemSettings.admin.id;
        this.menuService.detail = this.CONFIG.menus.systemSettings.general.id;
        this.limitSessionTimeItems = [...Object.values(this.limitSessionTimeUnits)];
        this.initApplyService();

        if (this.CONFIG.cloudCapabilities.alexaIntegrationEnabled) {
            delayInitial(this.cloudApi.getCustomAccountProperty(AlexaSettings.CUSTOM_PROPERTY_ENDPOINT)).pipe(
                AlexaSettings.cleanObservable(this.system.id),
                untilDestroyed(this)
            ).subscribe(settings => {
                this.alexaSettings = settings;
            }, _ => {
                this.alexaSettings = {};
            }
            );
        }

        const { system2faEnabled } = this.systemsService.systems
            .filter((system) => system.id === this.system.id)?.shift();
        this.system2faEnabled = system2faEnabled;
    }

    ngOnChanges(changes: SimpleChanges) {
        if (changes.settings) {
            const { previousValue, currentValue, firstChange } = changes.settings;
            if (previousValue === undefined && currentValue) {
                this.cleanUpWatchers(currentValue);
            }
            if ((JSON.stringify(previousValue) !== JSON.stringify(currentValue) || !this.settingsWatchersSet) && !firstChange && !this.applyService.locked) {
                this.setWatcherValues(currentValue);
            }
        }
    }

    ngOnDestroy() {
        this.applyService.removeWatchers();
    }

    // removes watcher(s) if setting does not exist
    cleanUpWatchers(settings) {
        Object.keys(this.settingsWatchers).forEach(sw => {
            if (!(sw in settings)) {
                delete this.settingsWatchers[sw];
            }
        });
    }

    setWatcherValues(settings) {
        this.applyService.setVisible(false);
        // this.applyService.reset(true);
        const sw = this.settingsWatchers;
        Object.keys(sw).forEach(setting => {
            let curr = settings[setting];
            if (curr) {
                /**
                 * sets initial values for system & security settings
                 * sessionLimitMinutes is the only one that's a number & not a boolean,
                 * so it needs custom code to handle
                 */
                if (isNaN(curr)) {
                    sw[setting].originalValue = curr === 'true';
                } else if (this.limitSessionTimeUnits) {
                    curr = parseInt(curr);
                    this.sessionLimitToggle = Boolean(curr);
                    this.selectedTimeUnit = this.limitSessionTimeUnits.minutes;
                    this.updateTimeUnitInput(this.selectedTimeUnit);
                    sw[setting].originalValue = curr;
                    this.timeValue = curr;
                    this.divideTimeValue(this.timeValue);
                }
            }
        });
        this.settingsWatchersSet = true;
        this.applyService.reset();
        this.applyService.setVisible(true);
    }

    initApplyService(): void {
        this.setWarningMessageThroughApplyService = () => {
            if (this.settingsWatchers.videoTrafficEncryptionForced.value) {
                this.applyService.setWarn(this.LANG.system.settings.warningMessages.videoEncryption?.());
            } else {
                this.applyService.setWarn('');
            }
        };

        this.saveSettings = this.processService.createProcess(() => {
            const sw = this.settingsWatchers;
            // handle sessionLimitMinutes when saving an empty value
            if (this.timeValue === null || this.timeValue === 0) {
                this.sessionLimitToggle = false;
                sw.sessionLimitMinutes.value = 0;
            } else {
                this.divideTimeValue(sw.sessionLimitMinutes.value);
            }
            const changes = {};
            for (const [setting, watcher] of Object.entries(sw)) {
                if (watcher.value !== watcher.originalValue) {
                    changes[setting] = watcher.value;
                    watcher.originalValue = watcher.value;
                }
            }
            return this.system.updateOrGetSystemSettings(changes).toPromise();
        });

        this.applyService.addWatchersAndFunctionsFromChild(
            Object.values(this.settingsWatchers),
            this.saveSettings,
            // handles the cancel button
            () => {
                this.applyService.reset();
                const { sessionLimitMinutes } = this.settingsWatchers;
                if (sessionLimitMinutes?.originalValue) {
                    this.sessionLimitToggle = true;
                    this.selectedTimeUnit = this.limitSessionTimeUnits.minutes;
                    this.updateTimeUnitInput(this.selectedTimeUnit);
                    this.timeValue = sessionLimitMinutes.originalValue;
                    this.divideTimeValue(this.timeValue);
                } else if (sessionLimitMinutes && sessionLimitMinutes.originalValue === 0) {
                    this.sessionLimitToggle = false;
                }
            });

        this.applyService.setVisible(false);
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
    updateTimeUnitInput(timeUnit): void {
        this.currentMaxTimeUnit = timeUnit.max;

        if (this.selectedTimeUnit.value !== timeUnit.value) {
            this.selectedTimeUnit = timeUnit;
            this.updateLimitSessionValue(this.timeValue);
        }
    }

    // storePreviousValue(e) {
    //     if (e.key.length === 1 && e.key.match(/[a-zA-Z\W]/)) { // Fix typing non-numerical chars (especially valid for FF)
    //         e.preventDefault();
    //     }
    //     this.previousInputValue = this.timeValue;
    // }

    updateLimitSessionValue(newTimeValue: number) {
        const sw = this.settingsWatchers;
        if (this.selectedTimeUnit.value === 'days') {
            sw.sessionLimitMinutes.value = newTimeValue * DAY_MINS;
        } else if (this.selectedTimeUnit.value === 'hours') {
            sw.sessionLimitMinutes.value = newTimeValue * HR_MINS;
        } else {
            sw.sessionLimitMinutes.value = newTimeValue;
        }
        this.timeValue = newTimeValue;
    }

    // handles showing default value on open and clearing to 0 on close
    handleSessionLimitToggle() {
        if (this.sessionLimitToggle) {
            this.selectedTimeUnit = this.limitSessionTimeUnits.days;
            this.timeValue = this.selectedTimeUnit.default;
            this.settingsWatchers.sessionLimitMinutes.value = this.selectedTimeUnit.default * DAY_MINS;
            this.updateTimeUnitInput(this.selectedTimeUnit);
        } else {
            this.timeValue = 0;
            this.settingsWatchers.sessionLimitMinutes.value = 0;
        }
    }

    // handle mandatory 2fa
    handleMandatory2fa() {
        if (this.is2faDialogActive) {
            return;
        }

        this.is2faDialogActive = this.dialogService.toggleSystem2fa(this.system, this.system2faEnabled).then((res) => {
            if (!res || res === 'cancel') {
                this.system2faEnabled = !this.system2faEnabled;
            }
        }).finally(() => {
            this.is2faDialogActive = undefined;
        });
    }

    // Alexa Methods
    updateEventRules = (settings = { enabled: true }) => {
        this.eventRulesBeingSetup = settings.enabled;
        return delayInitial(this.system.updateAlexaRules(settings.enabled)).pipe(
            catchError(error => {
                console.error(error);
                return delayInitial(Promise.resolve(false));
            }),
            tap(setup => {
                this.alexaSettings.eventRulesSetup = !!setup;
                this.eventRulesBeingSetup = false;
            })
        ).toPromise();
    }

    #updateAlexa = (settings: AlexaSettings) => this.CONFIG.cloudCapabilities.alexaIntegrationEnabled && delayInitial(
        this.cloudApi.saveCustomAccountProperty(settings, AlexaSettings.CUSTOM_PROPERTY_ENDPOINT)
    ).pipe(
        tap(settings => {
            this.alexaSettings = settings;
        }),
        switchMap(this.updateEventRules),
        map(setup => ({ ...settings, eventRulesSetup: !!setup })),
        untilDestroyed(this)
    ).subscribe(settings => {
        this.alexaSettings = settings;
        this.cloudApi.saveCustomAccountProperty(this.alexaSettings, AlexaSettings.CUSTOM_PROPERTY_ENDPOINT);
    });

    toggleAlexaEnabled = () => {
        const { enabled, selectedSystem, accountLinked = false, eventRulesSetup = false } = this.alexaSettings;
        this.alexaSettings = null;
        this.#updateAlexa({ enabled: !enabled, accountLinked, eventRulesSetup, selectedSystem: enabled ? this.system.id : selectedSystem });
    }

    toggleSystemSelected = () => {
        if (this.alexaSettings.selectedSystem === this.system.id) {
            return;
        }
        const { enabled, accountLinked = false, eventRulesSetup = false } = this.alexaSettings;
        this.alexaSettings = null;
        this.#updateAlexa({ enabled, accountLinked, eventRulesSetup, selectedSystem: this.system.id });
    }
}
