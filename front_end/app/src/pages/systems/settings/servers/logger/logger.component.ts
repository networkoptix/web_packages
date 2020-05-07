import {
    Component,
    OnDestroy, Input, OnChanges,
    SimpleChanges, ViewEncapsulation
}                                    from '@angular/core';
import { SubscriptionLike }          from 'rxjs';
import { AutoUnsubscribe }           from 'ngx-auto-unsubscribe';
import { NxConfigService, IConfig }  from '../../../../../services/nx-config';
import { NxLanguageProviderService } from '../../../../../services/nx-language-provider';
import { NxProcessService }          from '../../../../../services/process.service';
import { NxDialogsService }          from '../../../../../dialogs';
import { LanguageI18NStaticTypes }   from '../../../../../../language_i18n_static_types';

@AutoUnsubscribe()
@Component({
    selector      : 'nx-server-logger-component',
    templateUrl   : 'logger.component.html',
    styleUrls     : ['logger.component.scss'],
    encapsulation : ViewEncapsulation.None
})

export class NxServerLoggerComponent implements OnChanges, OnDestroy {
    CONFIG: IConfig;
    LANG: LanguageI18NStaticTypes;

    showLoggers: boolean;
    saveLoggers: any;
    lockedSubscription: SubscriptionLike;

    @Input() system: any;
    @Input() serverId: any;

    systemLoggers: any = {};
    readonly loggerOptions: any = [];

    private setupDefaults() {
        this.showLoggers = false;

        this.saveLoggers = this.processService.createProcess(() => {
            return this.system
                .setLogLevels(this.serverId, this.loggersToBeSaved())
                .then(response => {
                    if (typeof (response.error) !== 'undefined' && response.error !== '0') {
                        const errorToShow = response.errorString;
                        this.dialogsService
                            .alert(errorToShow, this.LANG.dialogs.titles.error)
                            .catch(error => {
                                console.error(error);
                            });
                    } else {
                        this.dialogsService
                            .alert(this.LANG.dialogs.message.logLevelsSaved, this.LANG.dialogs.titles.success)
                            .catch(error => {
                                console.error(error);
                            });
                    }
                }, () => {
                    this.dialogsService
                        .alert(this.LANG.dialogs.message.logLevelsNotSaved, this.LANG.dialogs.titles.error)
                        .catch(error => {
                            console.error(error);
                        });
                });
        });
    }

    constructor(
        configService: NxConfigService,
        language: NxLanguageProviderService,
        private processService: NxProcessService,
        private dialogsService: NxDialogsService
    ) {
        this.CONFIG = configService.getConfig();
        this.LANG = language.getTranslations();

        this.loggerOptions = [
            {
                value : 'none',
                name: this.LANG.system.loggers.none.text,
                help: this.LANG.system.loggers.none.help },
            {
                value : 'error',
                name: this.LANG.system.loggers.error.text,
                help: this.LANG.system.loggers.error.help },
            {
                value : 'warning',
                name  : this.LANG.system.loggers.warning.text,
                help  : this.LANG.system.loggers.warning.help
            },
            {
                value: 'info',
                name: this.LANG.system.loggers.info.text,
                help: this.LANG.system.loggers.info.help },
            {
                value: 'debug',
                name: this.LANG.system.loggers.debug.text,
                help: this.LANG.system.loggers.debug.help },
            {
                value : 'verbose',
                name  : this.LANG.system.loggers.verbose.text,
                help  : this.LANG.system.loggers.verbose.help
            }
        ];

        this.setupDefaults();
    }

    ngOnChanges(changes: SimpleChanges): void {
        if (changes.serverId && changes.serverId.currentValue) {
            this.system
                .logLevel(changes.serverId.currentValue)
                .then(response => {
                    this.settingsToBeDisplayedOrUpdated(response.reply);
                    this.showLoggers = (Object.keys(this.systemLoggers).length > 1);
                });
        }
    }

    ngOnDestroy(): void {
    }

    changeLog(selected, key) {
        this.systemLoggers[key].value = selected.value;
        this.systemLoggers[key].selected = selected;
    }

    settingsToBeDisplayedOrUpdated(loggers) {
        Object.keys(loggers).forEach((key) => {
            const value = loggers[key];
            const { name, help } = this.loggerOptions.filter(level => {
                return level.value === value;
            })[0];

            this.systemLoggers[key] = {};
            this.systemLoggers[key].key = key;
            this.systemLoggers[key].name = name;
            this.systemLoggers[key].help = help;
            this.systemLoggers[key].value = value;
            this.systemLoggers[key].originalValue = value;
        });
    }

    loggersToBeSaved() {
        const loggers = [];

        Object.keys(this.systemLoggers).forEach((key) => {
            if (this.systemLoggers[key].value !== this.systemLoggers[key].originalValue) {
                loggers.push(this.systemLoggers[key]);
            }
        });

        return loggers;
    }
}
