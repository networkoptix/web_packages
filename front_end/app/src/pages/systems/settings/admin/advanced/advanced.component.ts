import {
    Component,
    OnDestroy, Input, ViewChild
} from '@angular/core';
import { UntilDestroy }              from '@ngneat/until-destroy';
import {
    map, delay, retryWhen, take
}                                    from 'rxjs/operators';
import { Subscription }              from 'rxjs';
import { NgForm }                    from '@angular/forms';

import { NxDialogsService }             from '../../../../../dialogs/dialogs.service';
import { NxSettingsService }            from '../../settings.service';
import { NxConfigService, IConfig }     from '../../../../../services/nx-config';
import { NxLanguageProviderService }    from '../../../../../services/nx-language-provider';
import { NxProcessService, Process }    from '../../../../../services/process.service';
import { NxSystem }                     from '../../../../../services/system.service';
import { LanguageI18NStaticTypes }      from '../../../../../../language_i18n_static_types';
import { FormWatcher, NxApplyService }  from '../../../../../services/apply.service';

@UntilDestroy({ checkProperties: true })
@Component({
    selector    : 'nx-system-advanced-admin-component',
    templateUrl : 'advanced.component.html',
    styleUrls   : ['advanced.component.scss']
})

export class NxSystemAdvancedAdminComponent implements OnDestroy {
    CONFIG: IConfig;
    LANG: LanguageI18NStaticTypes;

    @Input() system: NxSystem;
    @ViewChild('systemSettingsForm', { static: true }) systemSettingsForm: NgForm

    haveAdvSettings: boolean;
    private serverSubscription: Subscription;
    private settingsSubscription: Subscription;

    systemSettings: any = {};
    changedFields = {};

    formWatcher: FormWatcher;
    saveSettings: Process;

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

    ngOnDestroy(): void {}

    ngOnInit() {
        this.settingsService.footerSubject.next(true);

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
                .updateOrGetSystemSettings(this.changedFields)
                .toPromise()
                .then((response: any) => {
                    if (typeof (response.error) !== 'undefined' && response.error !== '0') {
                        const errorToShow = response.errorString;
                        this.dialogsService
                            .alert(errorToShow, this.LANG.dialogs.titles.error?.())
                            .catch(error => {
                                console.error(error);
                            });
                    } else {
                        this.settingsToBeDisplayedOrUpdated(this.changedFields);
                        this.dialogsService
                            .alert(this.LANG.dialogs.message.settingsSaved?.(), this.LANG.dialogs.titles.success?.())
                            .then(() => {
                                this.formWatcher.hardReset();
                            })
                            .catch(error => {
                                console.error(error);
                            });
                    }
                }, () => {
                    this.dialogsService
                        .alert(this.LANG.dialogs.message.settingsNotSaved?.(), this.LANG.dialogs.titles.error?.())
                        .catch(error => {
                            console.error(error);
                        });
                });
        });

        this.formWatcher = this.applyService.createFormWatcher(
            'systemSettingsForm',
            this.systemSettingsForm,
            this.saveSettings
        );
        this.applyService.addWatchersAndFunctionsFromChild([this.formWatcher], this.saveSettings, () => console.log('discard'));
        this.applyService.reset();

        this.formWatcher.valueSubject.subscribe((values) => {
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
    }

    canSee(key) {
        return ['number', 'text', 'password'].includes(this.CONFIG.settingsConfig[key]?.type);
    }

    getAdvancedSettings() {
        this.system.updateOrGetSystemSettings()
            .toPromise()
            .then((response: any) => {
                this.settingsToBeDisplayedOrUpdated(response.reply.settings);
                this.haveAdvSettings = (Object.keys(response.reply.settings).length > 0);
            });
    }

    getDescription(key) {
        return this.LANG.settingsConfig[key] ? NxLanguageProviderService.translate(this.LANG.settingsConfig[key]) : key;
    }

    settingsToBeDisplayedOrUpdated = (settings) => {
        Object.entries(settings).reduce((systemSettings, [key, value]) => {
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
                    systemSettings[key] = (value !== '') ? parseInt(value as string) : '';
                    break;
                case 'checkbox':
                    systemSettings[key] = (typeof value === 'boolean') ? value : (value === 'true');
                    break;
                default:
                    systemSettings[key] = value;
            }

            return systemSettings;
        }, this.systemSettings);
    }
}
