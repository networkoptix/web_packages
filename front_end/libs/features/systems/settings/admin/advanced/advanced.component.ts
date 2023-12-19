import { Component, OnDestroy, Input, ViewChild, OnInit } from '@angular/core';
import { NgForm } from '@angular/forms';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { firstValueFrom, Subject } from 'rxjs';
import { map, delay, retryWhen, take } from 'rxjs/operators';

import { NxDialogsService } from '@dialogs/dialogs.service';
import staticLang from '@language_static';
import { NxApplyService } from '@services/apply.service';
import { FormWatcher } from '@services/apply.service/watcher';
import { SettingsConfig } from '@services/nx-config/base-config';
import { NxProcessService } from '@services/process.service';
import { Process } from '@services/process.service/process';
import type { NxSystem } from '@services/system.service/system';
import { settingsConfig } from '@static-variables';

type SystemSetting = {
    [key in keyof SettingsConfig]?: string | number | boolean | object;
};

@UntilDestroy()
@Component({
    selector: 'nx-system-advanced-admin-component',
    templateUrl: 'advanced.component.html',
    styleUrls: ['advanced.component.scss'],
})
export class NxSystemAdvancedAdminComponent implements OnInit, OnDestroy {
    @Input() system: NxSystem;
    @ViewChild('advancedSystemSettingsForm', { read: NgForm }) advancedSystemSettingsForm: NgForm;

    LANG = staticLang;

    haveAdvSettings: boolean;

    systemSettings: SystemSetting = {};
    changedFields = {};

    advancedFormWatcher: FormWatcher;
    saveAdvancedSettings: Process;
    reset$ = new Subject();
    settingsConfig = settingsConfig;

    constructor(
        private applyService: NxApplyService,
        private processService: NxProcessService,
        private dialogsService: NxDialogsService,
    ) {}

    ngOnInit(): void {
        this.system.infoSubject
            .pipe(
                untilDestroyed(this),
                map(system => {
                    if (!system.serverManager.servers?.length) {
                        // eslint-disable-next-line @typescript-eslint/no-throw-literal
                        throw system;
                    }
                }),
                retryWhen(err => err.pipe(delay(1000))),
            )
            .pipe(take(1))
            .subscribe(() => {
                if (this.system && this.system.serverManager.servers?.length) {
                    this.getAdvancedSettings();
                }
            });

        this.saveAdvancedSettings = this.processService.createProcess(() => {
            return firstValueFrom(this.system.updateOrGetSystemSettings(this.changedFields)).then(
                response => {
                    if (typeof response.error !== 'undefined' && response.error !== '0') {
                        this.dialogsService.alert({
                            title: this.LANG.dialogs.titles.error,
                            message: response.errorString,
                        });
                    } else {
                        this.settingsToBeDisplayedOrUpdated(this.changedFields);
                        this.dialogsService.alert({
                            title: this.LANG.dialogs.titles.success,
                            message: this.LANG.dialogs.message.settingsSaved,
                        });
                    }
                },
                () => {
                    this.dialogsService.alert({
                        title: this.LANG.dialogs.titles.error,
                        message: this.LANG.dialogs.message.settingsNotSaved,
                    });
                },
            );
        });
    }

    ngOnDestroy(): void {
        this.applyService.removeWatchers();
    }

    editable(key) {
        return ['number', 'text', 'password', 'checkbox', 'object'].includes(
            settingsConfig[key]?.type,
        );
    }

    systemSettingsChanged(value, key): void {
        this.systemSettings[key] = value;
    }

    trackSettingsObject(index: number): number {
        return index;
    }

    getAdvancedSettings(): void {
        firstValueFrom(this.system.updateOrGetSystemSettings()).then(response => {
            this.settingsToBeDisplayedOrUpdated(response.reply.settings);
            this.haveAdvSettings = Object.keys(response.reply.settings).length > 0;

            setTimeout(() => {
                this.advancedFormWatcher = this.applyService.createFormWatcher(
                    'advancedSystemSettingsForm',
                    this.advancedSystemSettingsForm,
                    this.saveAdvancedSettings,
                );

                this.advancedFormWatcher.valueSubject
                    .pipe(untilDestroyed(this))
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
        return this.LANG.settingsConfig[key] ? this.LANG.settingsConfig[key] : key;
    }

    settingsToBeDisplayedOrUpdated = (settings): void => {
        Object.entries(settings).reduce(
            (systemSettings: SystemSetting, [key, value]: [string, unknown]) => {
                // CLOUD-6350: Refactor advanced global settings page
                if (settingsConfig[key]?.hiddenInAdvanced) {
                    return systemSettings;
                }
                let type = settingsConfig[key]?.type;
                if (type === undefined) {
                    type = 'text';
                    if (Number.isInteger(value)) {
                        type = 'number';
                    } else if (['true', 'false'].includes(value as string)) {
                        type = 'checkbox';
                    }
                    settingsConfig[key] = { type };
                }
                switch (type) {
                    case 'number':
                        systemSettings[key] = value !== '' ? parseInt(value as string) : '';
                        break;
                    case 'checkbox':
                        systemSettings[key] = typeof value === 'boolean' ? value : value === 'true';
                        break;
                    default:
                        systemSettings[key] = value;
                }

                return systemSettings;
            },
            this.systemSettings,
        );
    };
}
