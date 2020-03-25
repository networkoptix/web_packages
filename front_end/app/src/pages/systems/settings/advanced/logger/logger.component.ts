import {
    Component, Inject,
    OnDestroy, Input, OnChanges,
    SimpleChanges, ViewEncapsulation
}                                    from '@angular/core';
import { SubscriptionLike }          from 'rxjs';
import { AutoUnsubscribe }           from 'ngx-auto-unsubscribe';
import { IConfig, NxConfigService }  from '../../../../../services/nx-config';
import { LanguageI18NStaticTypes }   from '../../../../../../language_i18n_static_types';
import { NxLanguageProviderService } from '../../../../../services/nx-language-provider';
import { NxProcessService }          from '../../../../../services/process.service';
import { NxDialogsService }          from '../../../../../dialogs/dialogs.service';

@AutoUnsubscribe()
@Component({
    selector      : 'nx-server-advanced-logger-component',
    templateUrl   : 'logger.component.html',
    styleUrls     : ['logger.component.scss'],
    encapsulation : ViewEncapsulation.None
})

export class NxSystemAdvancedLoggerComponent implements OnChanges, OnDestroy {
    CONFIG: IConfig;
    LANG: LanguageI18NStaticTypes;

    saveLoggers: any;
    lockedSubscription: SubscriptionLike;

    @Input() system: any;
    @Input() serverId: any;

    systemLoggers: any = {};

    loggerOptions: any = [
        { value: 'none', name: 'None: Log disabled' },
        { value: 'error', name: 'Error: Log errors only' },
        { value: 'warning', name: 'Warning: Log warnings and errors' },
        { value: 'info', name: 'Info: Warning: Log warnings, errors and all messages' },
        { value: 'debug', name: 'Debug: Log every System message and debug information' },
        { value: 'verbose', name: 'Verbose:  Log all information available' }
    ]

    constructor(
        configService: NxConfigService,
        language: NxLanguageProviderService,
        private processService: NxProcessService,
        private dialogsService: NxDialogsService
    ) {
        this.CONFIG = configService.getConfig();
        this.LANG = language.getTranslations();
    }

    ngOnChanges(changes: SimpleChanges): void {
        if (changes.serverId) {
            this.init();
        }
    }

    ngOnDestroy(): void {
    }

    init() {
        const mockResponse = {
            error       : '0',
            errorString : '',
            reply       : {
                EC2_TRAN    : 'none',
                HTTP        : 'none',
                HWID        : 'info',
                MAIN        : 'info',
                PERMISSIONS : 'none'
            }
        };

        this.system
            .logLevel(this.serverId)
            .toPromise()
            .then(response => {
                this.settingsToBeDisplayedOrUpdated(mockResponse.reply);
            });

        this.saveLoggers = this.processService.createProcess(() => {
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

    changeLog(selected, key) {
        this.systemLoggers[key].value = selected.value;
        this.systemLoggers[key].selected = selected;
    }

    settingsToBeDisplayedOrUpdated(loggers) {
        Object.keys(loggers).forEach((key) => {
            const value = loggers[key];
            const name = this.loggerOptions.filter(level => {
                return level.value === value;
            })[0].name;

            this.systemLoggers[key] = {};
            this.systemLoggers[key].selected = { name, value };
            this.systemLoggers[key].name = name;
            this.systemLoggers[key].value = value;
            this.systemLoggers[key].originalValue = value;
        });
    }

    settingsToBeSaved() {
        const serverSettings = {};

        Object.keys(this.systemLoggers).forEach((key) => {
            if (this.systemLoggers[key].value !== this.systemLoggers[key].originalValue) {
                serverSettings[key] = this.systemLoggers[key].value;
            }
        });

        return serverSettings;
    }
}
