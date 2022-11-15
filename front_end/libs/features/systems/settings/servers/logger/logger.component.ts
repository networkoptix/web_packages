import {
    Component,
    Input,
    OnChanges,
    ViewEncapsulation,
} from '@angular/core';

import staticLang from '@common/language/language_i18n_static.json';
import type {
    DropdownItem
} from '@components/dropdowns/generic/dropdown.component.types';
import { NxDialogsService } from '@dialogs/dialogs.service';
import { NxSimpleDialogsService } from '@dialogs/simple-dialogs.service';
import { NxApplyService } from '@services/apply.service';
import { Watcher } from '@services/apply.service/watcher';
import type { IConfig } from '@services/nx-config/config-types';
import { NxConfigService } from '@services/nx-config/nx-config.service';
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
    encapsulation: ViewEncapsulation.None
})
export class NxServerLoggerComponent implements OnChanges {
    @Input() system: NxSystem;
    @Input() serverId: string;

    CONFIG: IConfig;
    LANG = staticLang;

    showLoggers: boolean = false;
    saveLoggers: Process;
    loading: boolean = false;

    loggerWatcher = new Watcher<boolean>(false);
    systemLoggers: Logger[] = [];
    readonly loggerOptions: LoggerOption[];

    constructor(
        configService: NxConfigService,
        private processService: NxProcessService,
        private dialogsService: NxDialogsService,
        private simpleDialogService: NxSimpleDialogsService,
        private applyService: NxApplyService
    ) {
        this.CONFIG = configService.getConfig();

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
                this.dialogsService
                    .alert(
                        this.LANG.dialogs.message.logLevelsSaved,
                        this.LANG.dialogs.titles.success
                    ).catch(error => {
                        console.error(error);
                    });
            },
            err => {
                const handleError = (): void => {
                    this.dialogsService
                        .alert(
                            this.LANG.dialogs.message.logLevelsNotSaved,
                            this.LANG.dialogs.titles.error
                        ).catch(error => {
                            console.error(error);
                        });
                };
                if (err.errorId === this.CONFIG.servers.errors.oldSessionErrorId) {
                    this.simpleDialogService.refreshSession(this.system).then(res => {
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
