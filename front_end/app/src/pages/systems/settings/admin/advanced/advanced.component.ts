import {
    Component, SimpleChanges,
    OnDestroy, Input, OnChanges, ViewChild, ViewContainerRef
} from '@angular/core';
import { UntilDestroy }              from '@ngneat/until-destroy';
import {
    map, delay, retryWhen, take
}                                    from 'rxjs/operators';
import { Subscription }              from 'rxjs';

import { NxDialogsService }          from '../../../../../dialogs/dialogs.service';
import { NxSettingsService }         from '../../settings.service';
import { NxConfigService, IConfig }  from '../../../../../services/nx-config';
import { NxLanguageProviderService } from '../../../../../services/nx-language-provider';
import { NxProcessService, Process } from '../../../../../services/process.service';
import { NxSystem }                  from '../../../../../services/system.service';
import { LanguageI18NStaticTypes }                 from '../../../../../../language_i18n_static_types';
import { NxApplyService, SectionWatcher, Watcher } from '../../../../../services/apply.service';

@UntilDestroy({ checkProperties: true })
@Component({
    selector    : 'nx-system-advanced-admin-component',
    templateUrl : 'advanced.component.html',
    styleUrls   : ['advanced.component.scss']
})

export class NxSystemAdvancedAdminComponent implements OnChanges, OnDestroy {
    CONFIG: IConfig;
    LANG: LanguageI18NStaticTypes;

    @Input() system: NxSystem;

    haveAdvSettings: boolean;
    private serverSubscription: Subscription;

    systemSettings: any = {};

    sectionWatcher: SectionWatcher
    saveSettings: Process;
    resetSettings = () => Object.values(this.systemSettings).forEach((watcher: any) => watcher.reset());

    constructor(
        configService: NxConfigService,
        language: NxLanguageProviderService,
        private applyService: NxApplyService,
        private settingsService: NxSettingsService,
        private processService: NxProcessService,
        private dialogsService: NxDialogsService
    ) {
        this.CONFIG = configService.getConfig();
        this.LANG = language.translations;
    }

    ngOnChanges(changes: SimpleChanges): void {
        if (changes.system) {
            this.init();
        }
    }

    ngOnDestroy(): void {
    }

    init() {
        this.settingsService.footerSubject.next(true);

        if (this.serverSubscription) {
            this.serverSubscription.unsubscribe();
        }
        this.serverSubscription = this.system.infoSubject
            .pipe(
                map((system: any) => {
                    if (!system.servers || system.servers.length === 0) {
                        throw system;
                    }
                }),
                retryWhen(err => err.pipe(delay(1000)))
            )
            .pipe(take(1))
            .subscribe(() => {
                this.settingsService.footerSubject.next(true);
                if (this.system.currentServerNotBusy) {
                    if (this.system && this.system.servers && this.system.servers.length) {
                        this.getAdvancedSettings();
                    }
                }
            });

        this.saveSettings = this.processService.createProcess(() => {
            return this.system
                .updateOrGetSystemSettings(this.settingsToBeSaved())
                .toPromise()
                .then((response: any) => {
                    this.settingsToBeDisplayedOrUpdated(response.reply.settings);
                    if (typeof (response.error) !== 'undefined' && response.error !== '0') {
                        const errorToShow = response.errorString;
                        this.dialogsService
                            .alert(errorToShow, this.LANG.dialogs.titles.error)
                            .catch(error => {
                                console.error(error);
                            });
                    } else {
                        this.dialogsService
                            .alert(this.LANG.dialogs.message.settingsSaved, this.LANG.dialogs.titles.success)
                            .catch(error => {
                                console.error(error);
                            });
                    }
                }, () => {
                    this.dialogsService
                        .alert(this.LANG.dialogs.message.settingsNotSaved, this.LANG.dialogs.titles.error)
                        .catch(error => {
                            console.error(error);
                        });
                });
        });
    }

    canSee(key) {
        return ['number', 'text', 'password'].includes(this.CONFIG.settingsConfig[key].type);
    }

    getAdvancedSettings() {
        this.system.updateOrGetSystemSettings({ ignore: 'installedUpdateInformation,targetUpdateInformation' })
            .toPromise()
            .then((response: any) => {
                this.settingsToBeDisplayedOrUpdated(response.reply.settings);
                this.haveAdvSettings = (Object.keys(response.reply.settings).length > 0);
            });
    }

    settingsToBeDisplayedOrUpdated(settings) {
        const standardSettingsToExclude = [
            'autoDiscoveryEnabled',
            'statisticsAllowed',
            'cameraSettingsOptimization',
            'auditTrailEnabled',
            'trafficEncryptionForced',
            'videoTrafficEncryptionForced',
            'sessionLimitMinutes'
        ];

        Object.keys(settings).forEach((key) => {
            if (standardSettingsToExclude.includes(key)) {
                return;
            }
            const value = settings[key];
            if (!this.CONFIG.settingsConfig[key]) {
                let type = 'text';
                if (value === true || value === false ||
                    value === 'true' || value === 'false') {
                    type = 'checkbox';
                }
                this.CONFIG.settingsConfig[key] = { label: key, type: type };
            }

            this.systemSettings[key] = Watcher.extendedWatcherFactory(value, {});

            switch (this.CONFIG.settingsConfig[key].type) {
                case 'number':
                    this.systemSettings[key].value = this.systemSettings[key].originalValue = (value !== '') ? parseInt(value) : '';
                    break;
                case 'checkbox':
                    this.systemSettings[key].value = this.systemSettings[key].originalValue = (value === 'true');
                    break;
                default:
                    this.systemSettings[key].value = this.systemSettings[key].originalValue = value;
            }
        });

        this.sectionWatcher = this.applyService.createSectionWatcher(
            null,
            this.saveSettings,
            this.resetSettings,
            Object.values(this.systemSettings)
        );

        this.applyService.addWatchersAndFunctionsFromChild([this.sectionWatcher], this.saveSettings, this.resetSettings);
    }

    settingsToBeSaved() {
        const serverSettings = {};

        Object.keys(this.systemSettings).forEach((key) => {
            if (this.systemSettings[key].value !== this.systemSettings[key].originalValue) {
                serverSettings[key] = this.systemSettings[key].value;
            }
        });

        return serverSettings;
    }
}
