import {
    Component,
    Input,
    OnChanges, ViewChild,
    ViewEncapsulation,
} from '@angular/core';
import { NgForm } from '@angular/forms';
import { UntilDestroy } from '@ngneat/until-destroy';
import { Subject } from 'rxjs';
import { debounceTime, takeUntil } from 'rxjs/operators';

import { LanguageI18NStaticTypes } from '@app/language_i18n_static_types';
import type {
    DropdownItem
} from '@components/dropdowns/generic/dropdown.component.types';
import { NxDialogsService } from '@dialogs/dialogs.service';
import { NxApplyService } from '@services/apply.service';
import { FormWatcher, Watcher } from '@services/apply.service/watcher';
import type { IConfig } from '@services/nx-config/config-types';
import { NxConfigService } from '@services/nx-config/nx-config.service';
import { NxLanguageProviderService } from '@services/nx-language-provider';
import { NxProcessService } from '@services/process.service';
import { Process } from '@services/process.service/process';
import type { LogLevel, LogLevelReply } from '@services/system-api.types';
import type { NxSystem } from '@services/system.service/system';
import { NgChanges } from '@utils/ng-changes';

interface LoggerOption extends DropdownItem<string> {
    help: string;
}

interface Logger {
    key: string;
    value: string;
    originalValue: string;
}

@UntilDestroy({ checkProperties: true })
@Component({
    selector: 'nx-server-logger-component',
    templateUrl: 'logger.component.html',
    styleUrls: ['logger.component.scss'],
    encapsulation: ViewEncapsulation.None
})
export class NxServerLoggerComponent implements OnChanges {
    @Input() system: NxSystem;
    @Input() serverId: string;

    @ViewChild('logLevelsForm') logLevelsForm: NgForm;

    CONFIG: IConfig;
    LANG: LanguageI18NStaticTypes;

    showLoggers: boolean = false;
    saveLoggers: Process;
    loading: boolean = false;
    formWatcher: FormWatcher;

    loggerWatcher = new Watcher<boolean>(false);
    systemLoggers: Logger[] = [];
    readonly loggerOptions: LoggerOption[];
    cancelPrevious$ = new Subject<any>();

    constructor(
        configService: NxConfigService,
        language: NxLanguageProviderService,
        private processService: NxProcessService,
        private dialogsService: NxDialogsService,
        private applyService: NxApplyService
    ) {
        this.CONFIG = configService.getConfig();
        this.LANG = language.translations;

        this.loggerOptions = [
            'none',
            'error',
            'warning',
            'info',
            'debug',
            'verbose',
        ].map(level => ({
            value: level,
            name: this.LANG.system.loggers[level].text(),
            help: this.LANG.system.loggers[level].help()
        }));

        this.saveLoggers = this.processService.createProcess(() => {
            return this.system.serverManager
                .setLogLevels(
                    this.serverId,
                    this.systemLoggers.filter(logger =>
                        logger.value !== logger.originalValue
                    )
                )
                .then(() => {
                    this.systemLoggers.forEach(logger => {
                        logger.originalValue = logger.value;
                    });
                    this.dialogsService
                        .alert(
                            this.LANG.dialogs.message.logLevelsSaved(),
                            this.LANG.dialogs.titles.success()
                        ).catch(error => {
                            console.error(error);
                        });
                }, () => {
                    this.dialogsService
                        .alert(
                            this.LANG.dialogs.message.logLevelsNotSaved(),
                            this.LANG.dialogs.titles.error()
                        ).catch(error => {
                            console.error(error);
                        });
                });
        });
    }

    ngOnChanges(changes: NgChanges<NxServerLoggerComponent>): void {
        if (changes.serverId?.previousValue) {
            this.init();
        }
    }

    ngAfterViewInit(): void {
        this.init();
    }

    init = () => {
        this.system.serverManager
            .logLevel(this.serverId)
            .then((response: LogLevel) => {
                this.settingsToBeDisplayedOrUpdated(response.reply);
                this.showLoggers = (Object.keys(this.systemLoggers).length > 1);
                this.loading = false;
            }).catch(console.error);
    };

    resetForm = (): void => {
        this.systemLoggers.forEach(logger => {
            logger.value = logger.originalValue;
        });
        this.loggerWatcher.reset();
    };

    settingsToBeDisplayedOrUpdated = loggers => {
        this.formWatcher = new FormWatcher(this.logLevelsForm);
        const reset = () => {
            Object.keys(loggers).forEach(key => {
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
            this.formWatcher.reset();
            this.loggerWatcher.reset();
        };
        reset();
        this.cancelPrevious$.next('cancel');
        this.formWatcher.valueSubject.pipe(
            takeUntil(this.cancelPrevious$),
            debounceTime(10)
        ).subscribe(_ => {
            this.loggerWatcher.value = this.formWatcher.changed;
        });
        this.applyService.addWatchersAndFunctionsFromChild(
            [this.loggerWatcher],
            this.saveLoggers,
            reset
        );
    };

    initializeLoggerLevels = (loggers: LogLevelReply): void => {
        this.systemLoggers = Object.entries(loggers).map(([key, value]) => ({
            key,
            value,
            originalValue: value
        }));

        this.loggerWatcher.reset();
        this.applyService.addWatchersAndFunctionsFromChild(
            [this.loggerWatcher],
            this.saveLoggers,
            this.resetForm
        );
    };

    selectedLevel(target: Logger): LoggerOption {
        return this.loggerOptions.find(opt => opt.value === target.value);
    }

    onLevelSelect($selected: LoggerOption, target: Logger): void {
        target.value = $selected.value;
        this.loggerWatcher.value = this.systemLoggers.some(logger =>
            logger.value !== logger.originalValue
        );
    }
}
