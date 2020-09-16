import {
    Component, OnInit, Inject, Input, ViewContainerRef,
    ViewChild, ElementRef, OnChanges, SimpleChanges
}                                    from '@angular/core';

import { NxConfigService, IConfig }  from '../../../../../services/nx-config';
import { NxLanguageProviderService } from '../../../../../services/nx-language-provider';
import { NxProcessService, Process } from '../../../../../services/process.service';
import { NxSystem }                  from '../../../../../services/system.service';
import { NxApplyService, Watcher }   from '../../../../../services/apply.service';
import { NxMenuService }             from '../../../../../menu';
import { LanguageI18NStaticTypes }   from '../../../../../../language_i18n_static_types';

@Component({
    selector    : 'nx-system-standard-admin-component',
    templateUrl : 'standard.component.html',
    styleUrls   : ['standard.component.scss']
})

export class NxSystemStandardAdminComponent implements OnInit, OnChanges {
    @Input() settings;
    @Input() system: NxSystem;
    CONFIG: IConfig;
    LANG: LanguageI18NStaticTypes;

    selectedTimeUnit;
    sessionLimitToggle: boolean;
    timeValue: number;
    currentMaxTimeUnit: number;
    previousInputValue: number;
    limitSessionTimeUnits;
    limitSessionTimeItems;
    saveSettings: Process;
    resetVideoEncryptionIfDisabled;
    setWarningMessageThroughApplyService;
    timeUnitTracker;
    selectElement;

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
        private applyService: NxApplyService,
        private processService: NxProcessService,
        private menuService: NxMenuService
    ) {
        this.CONFIG = configService.getConfig();
        this.LANG = language.translations;
    }

    ngOnInit(): void {
        this.limitSessionTimeUnits = {
            hours: {
                value   : this.hours,
                name    : this.LANG.system.settings.sessionLimitDuration.hours(),
                id      : 1,
                max     : 600,
                default : 24
            },
            minutes: {
                value : this.minutes,
                name  : this.LANG.system.settings.sessionLimitDuration.minutes(),
                id    : 2,
                max   : 600
            }
        };
        this.menuService.section = this.CONFIG.menus.systemSettings.admin.id;
        this.menuService.detail = this.CONFIG.menus.systemSettings.general.id;
        this.limitSessionTimeItems = [this.limitSessionTimeUnits.hours, this.limitSessionTimeUnits.minutes];
        this.initApplyService();
    }

    ngOnChanges(changes: SimpleChanges) {
        if (changes.settings) {
            const { previousValue, currentValue, firstChange } = changes.settings;
            if (previousValue === undefined && currentValue) {
                this.cleanUpWatchers(currentValue);
            }
            if (JSON.stringify(previousValue) !== JSON.stringify(currentValue) && !firstChange) {
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
            let curr = settings[setting];
            if (curr) {
                /**
                 * sets initial values for system & security settings
                 * sessionLimitMinutes is the only one that's a number & not a boolean,
                 * so it needs custom code to handle
                 */
                if (isNaN(curr)) {
                    sw[setting].value = curr === 'true';
                } else if (this.limitSessionTimeUnits) {
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
            return this.system.updateOrGetSystemSettings(changes).toPromise();
        }).then(() => this.applyService.reset());

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
                    this.timeValue = sessionLimitMinutes.originalValue;
                    if (this.timeValue % 60 === 0) {
                        this.timeValue /= 60;
                        this.selectedTimeUnit = this.limitSessionTimeUnits.hours;
                    }
                } else if (sessionLimitMinutes && sessionLimitMinutes.originalValue === 0) {
                    this.sessionLimitToggle = false;
                }
            });

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
            this.timeValue = newTimeValue;
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
