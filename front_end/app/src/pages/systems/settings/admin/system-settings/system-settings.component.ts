import {
    Component, OnInit, Inject, Input, ViewContainerRef,
    ViewChild, ElementRef, OnChanges, SimpleChanges
}                                    from '@angular/core';
import { NxConfigService, IConfig }  from '../../../../../services/nx-config';
import { NxLanguageProviderService } from '../../../../../services/nx-language-provider';
import { NxProcessService }          from '../../../../../services/process.service';
import { NxSystem }                  from '../../../../../services/system.service';
import { NxApplyService, Watcher }   from '../../../../../services/apply.service';
import { LanguageI18NStaticTypes }   from '../../../../../../language_i18n_static_types';

@Component({
    selector : 'nx-system-settings-component',
    templateUrl : 'system-settings.component.html',
    styleUrls : ['system-settings.component.scss']
})

export class NxSystemSettingsComponent implements OnInit, OnChanges {
    @Input() settings: any;
    @Input() system: NxSystem;
    CONFIG: IConfig;
    LANG: LanguageI18NStaticTypes;
    viewContainerRef: ViewContainerRef;

    selectedTimeUnit: any;
    sessionLimitToggle: boolean;
    timeValue: number;
    currentMaxTimeUnit: number;
    previousInputValue: number;
    limitSessionTimeUnits: any;
    limitSessionTimeItems: any;
    saveSettings: any;
    resetVideoEncryptionIfDisabled: any;
    setWarningMessageThroughApplyService: any;
    timeUnitTracker: any;
    selectElement: any;

    settingsWatchersSet = false;
    settingsWatchers: any = {
        autoDiscoveryEnabled         : new Watcher<boolean>(),
        statisticsAllowed            : new Watcher<boolean>(),
        cameraSettingsOptimization   : new Watcher<boolean>(),
        auditTrailEnabled            : new Watcher<boolean>(),
        trafficEncryptionForced      : new Watcher<boolean>(),
        videoTrafficEncryptionForced : new Watcher<boolean>(),
        sessionLimitMinutes          : new Watcher<number>()
    };

    readonly minutes: string = 'minutes';
    readonly hours: string = 'hours';

    @ViewChild('timeUnitTracker', { static: false }) set el(el: ElementRef) {
        if (el) {
            this.timeUnitTracker = el;
            this.updateTimeUnitInput(this.selectedTimeUnit);
        }
    }

    @ViewChild('selectorTracker') set selectEle(el: ElementRef) {
        if (el) {
            this.selectElement = el;
        }
    }

    constructor(
        configService: NxConfigService,
        language: NxLanguageProviderService,
        @Inject(ViewContainerRef) viewContainerRef,
        private applyService: NxApplyService,
        private processService: NxProcessService
    ) {
        this.viewContainerRef = viewContainerRef;
        this.CONFIG = configService.getConfig();
        this.LANG = language.getTranslations();
    }

    ngOnInit(): void {
        this.limitSessionTimeUnits = {
            hours   : { value: this.hours, name: this.LANG.system.settings.sessionLimitDuration.hours, id: 1, max: 600, default: 24 },
            minutes : { value: this.minutes, name: this.LANG.system.settings.sessionLimitDuration.minutes, id: 2, max: 600 }
        };
        this.limitSessionTimeItems = [this.limitSessionTimeUnits.hours, this.limitSessionTimeUnits.minutes];
        this.initApplyService();
    }

    ngOnChanges(changes: SimpleChanges) {
        if (changes.settings) {
            const { previousValue, currentValue } = changes.settings;
            if (previousValue === undefined && currentValue) {
                this.cleanUpWatchers(currentValue);
            }
            if (JSON.stringify(previousValue) !== JSON.stringify(currentValue)) {
                this.setWatcherValues(currentValue);
            }
        }
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
        this.applyService.hardReset();
        const sw = this.settingsWatchers;
        Object.keys(sw).forEach(setting => {
            if (setting in settings) {
                let curr = settings[setting];
                /**
                 * sets initial values for system & security settings
                 * sessionLimitMinutes is the only one that's a number & not a boolean,
                 * so it needs custom code to handle
                 */
                if (isNaN(curr)) {
                    sw[setting].value = curr === 'true';
                } else {
                    curr = parseInt(curr);
                    this.sessionLimitToggle = Boolean(curr);
                    this.selectedTimeUnit = this.limitSessionTimeUnits.minutes;

                    sw[setting].value = curr;
                    this.timeValue = curr;
                    if (this.timeValue % 60 === 0) {
                        this.timeValue /= 60;
                        this.selectedTimeUnit = this.limitSessionTimeUnits.hours;
                    }
                }
            }
        });
        this.settingsWatchersSet = true;
        this.applyService.reset();
        this.applyService.setVisible(true);
    }

    initApplyService(): void {
        this.resetVideoEncryptionIfDisabled = () => {
            const encryptTraffic = this.settingsWatchers.trafficEncryptionForced.value;
            const encryptVideo = this.settingsWatchers.videoTrafficEncryptionForced.value;
            if (encryptVideo) {
                this.applyService.setWarn('');
            }
            if (!encryptTraffic && encryptVideo) {
                this.settingsWatchers.videoTrafficEncryptionForced.value = false;
            }
        };

        this.setWarningMessageThroughApplyService = () => {
            if (this.settingsWatchers.videoTrafficEncryptionForced.value) {
                this.applyService.setWarn(this.LANG.system.settings.warningMessages.videoEncryption);
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
            }
            const changes = {};
            const settings = Object.keys(sw);
            for (const setting of settings) {
                const obj = sw[setting];
                if (obj.value !== obj.originalValue) {
                    changes[setting] = obj.value;
                    obj.originalValue = obj.value;
                }
            }
            return this.system.updateOrGetSystemSettings(changes).toPromise()
                .then(() => this.applyService.reset());
        });

        this.applyService.initPageWatcher(
            this.viewContainerRef,
            this.saveSettings,
            // handles the cancel button
            () => {
                this.applyService.reset();
                const { sessionLimitMinutes } = this.settingsWatchers;
                if (sessionLimitMinutes && sessionLimitMinutes.originalValue) {
                    this.sessionLimitToggle = true;
                    this.selectedTimeUnit = this.limitSessionTimeUnits.minutes;
                    this.timeValue = sessionLimitMinutes.originalValue;
                    if (this.timeValue % 60 === 0) {
                        this.timeValue /= 60;
                        this.selectedTimeUnit = this.limitSessionTimeUnits.hours;
                    }
                } else if (sessionLimitMinutes && sessionLimitMinutes.originalValue === 0) {
                    this.sessionLimitToggle = false;
                }
            },
            Object.values(this.settingsWatchers));

        this.applyService.setVisible(false);
    }

    // sets input max value and updates hour/minutes
    updateTimeUnitInput(timeUnit) {
        this.currentMaxTimeUnit = timeUnit.max;
        const el = this.timeUnitTracker;
        if (el) {
            if (el.nativeElement.value > this.currentMaxTimeUnit) {
                el.nativeElement.value = this.currentMaxTimeUnit;
            }
            el.nativeElement.setAttribute('max', this.currentMaxTimeUnit);

            if (this.selectedTimeUnit.value !== timeUnit.value) {
                this.selectedTimeUnit = timeUnit;
                this.updateLimitSessionValue(this.timeValue);
            }
        }
    }

    storePreviousValue(ev) {
        // prevents [.+-e] from being inputed
        if (['.', '+', '-', 'e'].includes(ev.key)) {
            ev.preventDefault();
        }
        this.previousInputValue = this.timeValue;
    }

    validationCheckForInput() {
        if (this.timeValue > this.currentMaxTimeUnit) {
            this.timeValue = this.previousInputValue;
            this.updateLimitSessionValue(this.timeValue);
        }
    }

    updateLimitSessionValue(newTimeValue) {
        const sw = this.settingsWatchers;
        if (this.selectedTimeUnit.value === this.hours) {
            sw.sessionLimitMinutes.value = newTimeValue * 60;
        } else if (newTimeValue % 60 === 0) {
            sw.sessionLimitMinutes.value = newTimeValue;
            newTimeValue /= 60;
            // handler for when minutes gets changed to hours in the same change
            // 120 hours --> 120 minutes --> 2 hours
            this.selectElement.change(this.limitSessionTimeUnits.hours);
        } else {
            sw.sessionLimitMinutes.value = newTimeValue;
        }
        this.timeValue = newTimeValue;
    }

    // handles showing default value on open and clearing to 0 on close
    handleSessionLimitToggle() {
        if (this.sessionLimitToggle) {
            this.selectedTimeUnit = this.limitSessionTimeUnits.hours;
            this.timeValue = this.selectedTimeUnit.default;
            this.settingsWatchers.sessionLimitMinutes.value = this.selectedTimeUnit.default * 60;
        } else {
            this.timeValue = 0;
            this.settingsWatchers.sessionLimitMinutes.value = 0;
        }
    }
}
