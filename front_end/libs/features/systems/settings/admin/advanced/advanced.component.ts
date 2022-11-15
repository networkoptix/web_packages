import {
    Component,
    OnDestroy,
    Input,
    ViewChild
} from '@angular/core';
import { NgForm } from '@angular/forms';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { Subject } from 'rxjs';
import { map, delay, retryWhen, take } from 'rxjs/operators';

import staticLang from '@common/language/language_i18n_static.json';
import { NxDialogsService } from '@dialogs/dialogs.service';
import { NxApplyService } from '@services/apply.service';
import { FormWatcher } from '@services/apply.service/watcher';
import type { IConfig } from '@services/nx-config/config-types';
import { NxConfigService } from '@services/nx-config/nx-config.service';
import { NxProcessService } from '@services/process.service';
import { Process } from '@services/process.service/process';
import type { NxSystem } from '@services/system.service/system';

interface SystemSetting {
    [key: string]: unknown
}

@UntilDestroy()
@Component({
    selector: 'nx-system-advanced-admin-component',
    templateUrl: 'advanced.component.html',
    styleUrls: ['advanced.component.scss']
})

export class NxSystemAdvancedAdminComponent implements OnDestroy {
    @Input() system: NxSystem;
    @ViewChild('advancedSystemSettingsForm', { read: NgForm }) advancedSystemSettingsForm: NgForm;

    CONFIG: IConfig;
    LANG = staticLang;

    haveAdvSettings: boolean;

    systemSettings: SystemSetting = {};
    changedFields = {};

    advancedFormWatcher: FormWatcher;
    saveAdvancedSettings: Process;
    reset$ = new Subject();

    constructor(
        configService: NxConfigService,
        private applyService: NxApplyService,
        private processService: NxProcessService,
        private dialogsService: NxDialogsService
    ) {
        this.CONFIG = configService.getConfig();
    }

    ngOnInit(): void {
        this.system.infoSubject
            .pipe(
                untilDestroyed(this),
                map((system: any) => {
                    if (!system.servers || system.servers.length === 0) {
                        throw system;
                    }
                }),
                retryWhen(err => err.pipe(delay(1000)))
            )
            .pipe(take(1))
            .subscribe(() => {
                if (this.system.currentServerNotBusy) {
                    if (
                        this.system &&
                        this.system.servers &&
                        this.system.servers.length
                    ) {
                        this.getAdvancedSettings();
                    }
                }
            });

        this.saveAdvancedSettings = this.processService.createProcess(() => {
            return this.system
                .updateOrGetSystemSettings(this.changedFields)
                .toPromise()
                .then((response: any) => {
                    if (
                        typeof (response.error) !== 'undefined' &&
                        response.error !== '0'
                    ) {
                        const errorToShow = response.errorString;
                        this.dialogsService
                            .alert(errorToShow, this.LANG.dialogs.titles.error)
                            .catch(error => {
                                console.error(error);
                            });
                    } else {
                        this.settingsToBeDisplayedOrUpdated(this.changedFields);
                        this.dialogsService
                            .alert(
                                this.LANG.dialogs.message.settingsSaved,
                                this.LANG.dialogs.titles.success
                            ).catch(error => {
                                console.error(error);
                            });
                    }
                }, () => {
                    this.dialogsService
                        .alert(
                            this.LANG.dialogs.message.settingsNotSaved,
                            this.LANG.dialogs.titles.error
                        ).catch(error => {
                            console.error(error);
                        });
                });
        });
    }

    ngOnDestroy(): void {
        this.applyService.removeWatchers();
    }

    canSee(key) {
        return ['number', 'text', 'password'].includes(
            this.CONFIG.settingsConfig[key]?.type
        );
    }

    getAdvancedSettings(): void {
        this.system.updateOrGetSystemSettings()
            .toPromise()
            .then((response: any) => {
                this.settingsToBeDisplayedOrUpdated(response.reply.settings);
                this.haveAdvSettings = (Object.keys(response.reply.settings).length > 0);

                setTimeout(() => {
                    this.advancedFormWatcher = this.applyService.createFormWatcher(
                        'advancedSystemSettingsForm',
                        this.advancedSystemSettingsForm,
                        this.saveAdvancedSettings
                    );

                    this.advancedFormWatcher.valueSubject
                        .pipe(
                            untilDestroyed(this))
                        .subscribe(values => {
                            if (values) {
                                Object.entries(values).forEach(([key, current]) => {
                                    const original = this.systemSettings[key];
                                    const changed = current !== original;
                                    if (changed) {
                                        this.changedFields[key] = current;
                                    } else if (key in this.changedFields) {
                                        delete this.changedFields[key];
                                    }
                                });
                            }
                        });
                });
            });
    }

    getDescription(key) {
        return this.LANG.settingsConfig[key]
            ? this.LANG.settingsConfig[key]
            : key;
    }

    settingsToBeDisplayedOrUpdated = (settings): void => {
        Object.entries(settings).reduce((systemSettings: SystemSetting, [key, value]: [string, unknown]) => {
            // CLOUD-6350: Refactor advanced global settings page
            if (this.CONFIG.settingsConfig[key]?.hiddenInAdvanced) {
                return systemSettings;
            }
            let type = this.CONFIG.settingsConfig[key]?.type;
            if (type === undefined) {
                type = 'text';
                if (Number.isInteger(value)) {
                    type = 'number';
                } else if (['true', 'false'].includes(value as string)) {
                    type = 'checkbox';
                }
                this.CONFIG.settingsConfig[key] = { type };
            }
            switch (type) {
                case 'number':
                    systemSettings[key] = (value !== '')
                        ? parseInt(value as string)
                        : '';
                    break;
                case 'checkbox':
                    systemSettings[key] = (typeof value === 'boolean')
                        ? value
                        : (value === 'true');
                    break;
                default:
                    systemSettings[key] = value;
            }

            return systemSettings;
        }, this.systemSettings);
    };
}
