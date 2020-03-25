import {
    Component, Inject,
    OnDestroy, Input, OnChanges,
    SimpleChanges
}                                    from '@angular/core';
import {
    map, delay,
    retryWhen, take
}                                    from 'rxjs/operators';
import { Subscription }              from 'rxjs';
import { AutoUnsubscribe }           from 'ngx-auto-unsubscribe';
import { IConfig, NxConfigService }  from '../../../../../services/nx-config';
import { LanguageI18NStaticTypes }   from '../../../../../../language_i18n_static_types';
import { NxLanguageProviderService } from '../../../../../services/nx-language-provider';
import { NxProcessService }          from '../../../../../services/process.service';
import { NxDialogsService }          from '../../../../../dialogs/dialogs.service';
import { NxSettingsService }         from '../../settings.service';
import { NxMenuService }             from '../../../../../components/menu/menu.service';

@AutoUnsubscribe()
@Component({
    selector    : 'nx-server-advanced-settings-component',
    templateUrl : 'settings.component.html',
    styleUrls   : ['settings.component.scss']
})

export class NxSystemAdvancedSettingsComponent implements OnChanges, OnDestroy {
    CONFIG: IConfig;
    LANG: LanguageI18NStaticTypes;

    @Input() system: any;
    @Input() serverId: any;

    private saveSettings: any;
    private serverSubscription: Subscription;

    systemSettings: any = {};

    constructor(
        configService: NxConfigService,
        language: NxLanguageProviderService,
        private settingsService: NxSettingsService,
        private processService: NxProcessService,
        private menuService: NxMenuService,
        private dialogsService: NxDialogsService
    ) {
        this.CONFIG = configService.getConfig();
        this.LANG = language.getTranslations();
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

                    this.setServer();
                }
            });

        this.saveSettings = this.processService.createProcess(() => {
            return this.system
                .updateOrGetSystemSettings(this.settingsToBeSaved())
                .toPromise()
                .then(response => {
                    // this.applyService.reset();
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

    setServer(): void {
        if (this.system && this.system.servers && this.system.servers.length > 0 && this.serverId) {
            this.menuService.setDetailsSection(this.serverId);
        }
    }

    getAdvancedSettings() {
        this.system.updateOrGetSystemSettings({ ignore: 'installedUpdateInformation,targetUpdateInformation' })
            .toPromise()
            .then(response => {
                this.settingsToBeDisplayedOrUpdated(response.reply.settings);
            });
    }

    settingsToBeDisplayedOrUpdated(settings) {
        Object.keys(settings).forEach((key) => {
            const value = settings[key];
            if (!this.CONFIG.settingsConfig[key]) {
                let type = 'text';
                if (value === true || value === false ||
                    value === 'true' || value === 'false') {
                    type = 'checkbox';
                }
                this.CONFIG.settingsConfig[key] = { label: key, type: type };
            }

            this.systemSettings[key] = {};

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
