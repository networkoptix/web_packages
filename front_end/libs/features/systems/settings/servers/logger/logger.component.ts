import { Component, Input, OnChanges, ViewEncapsulation } from '@angular/core';

import staticLang from '@common/language/language_i18n_static.json';
import type { DropdownItem } from '@components/dropdowns/generic/dropdown.component.types';
import { NxDialogsService } from '@dialogs/dialogs.service';
import { SessionState } from '@dialogs/update-session/update-session.component.types';
import { servers } from '@lib/variables/static-variables';
import { NxApplyService } from '@services/apply.service';
import { Watcher } from '@services/apply.service/watcher';
import { NxProcessService } from '@services/process.service';
import { Process } from '@services/process.service/process';
import type { LogLevel, LogLevelReply } from '@services/system-api.types';
import type { NxSystem } from '@services/system.service/system';
import { NgChanges } from '@utils/ng-changes';

import type { Logger } from './logger.component.types';

interface LoggerOption extends DropdownItem<string> {
    help: string;
}

@Component({
    selector: 'nx-server-logger-component',
    templateUrl: 'logger.component.html',
    styleUrls: ['logger.component.scss'],
    encapsulation: ViewEncapsulation.None,
})
export class NxServerLoggerComponent implements OnChanges {
    @Input() system: NxSystem;
    @Input() serverId: string;

    LANG = staticLang;

    showLoggers: boolean = false;
    saveLoggers: Process;
    loading: boolean = false;

    loggerWatcher = new Watcher<boolean>(false);
    systemLoggers: Logger[] = [];
    readonly loggerOptions: LoggerOption[];

    constructor(
        private processService: NxProcessService,
        private dialogsService: NxDialogsService,
        private applyService: NxApplyService,
    ) {
        this.loggerOptions = [
            'none',
            'error',
            'warning',
            'info',
            'debug',
            'verbose',
        ].map(level => ({
            value: level,
            name: this.LANG.system.loggers[level].text,
            help: this.LANG.system.loggers[level].help
        }));

        this.saveLoggers = this.processService.createProcess(
            () => this.system.serverManager
                .setLogLevels(
                    this.serverId,
                    this.systemLoggers.filter(logger =>
                        logger.value !== logger.originalValue
                    )
                ),
            { ignoreError: true },
            () => {
                this.systemLoggers.forEach(logger => {
                    logger.originalValue = logger.value;
                });
                this.dialogsService.alert({
                    title: this.LANG.dialogs.titles.success,
                    message: this.LANG.dialogs.message.logLevelsSaved,
                });
            },
            err => {
                const handleError = (): void => {
                    this.dialogsService.alert({
                        title: this.LANG.dialogs.titles.error,
                        message: this.LANG.dialogs.message.logLevelsNotSaved,
                    });
                };
                if (err.errorId === servers.errors.oldSessionErrorId) {
                    this.dialogsService.updateSession({
                        sessionState: SessionState.RenewWeb,
                        system: this.system,
                    }).then(res => {
                        if (res) {
                            this.saveLoggers.run();
                        } else {
                            handleError();
                        }
                    }, error => console.error(error));
                } else {
                    handleError();
                }
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

    init = (): void => {
        this.system.serverManager
            .logLevel(this.serverId)
            .then((response: LogLevel) => {
                this.initializeLoggerLevels(response.reply);
                this.showLoggers = this.systemLoggers.length > 1;
                this.loading = false;
            }).catch(console.error);
    };

    resetForm = (): void => {
        this.systemLoggers.forEach(logger => {
            logger.value = logger.originalValue;
        });
        this.loggerWatcher.reset();
    };

    initializeLoggerLevels = (loggers: LogLevelReply): void => {
        this.systemLoggers = Object.entries(loggers).map(([key, value]) => ({
            key,
            value,
            originalValue: value
        }));
        console.log(this.systemLoggers);

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
