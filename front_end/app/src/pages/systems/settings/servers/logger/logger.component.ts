import {
    Component,
    Input,
    OnChanges,
    SimpleChanges,
    ViewEncapsulation,
    ViewChild,
} from '@angular/core';
import { NgForm } from '@angular/forms';
import { UntilDestroy } from '@ngneat/until-destroy';
import { Subject, SubscriptionLike } from 'rxjs';
import { debounceTime, takeUntil } from 'rxjs/operators';

import { LanguageI18NStaticTypes } from '@app/language_i18n_static_types';
import { NxDialogsService } from '@dialogs/dialogs.service';
import { NxApplyService, FormWatcher, Watcher } from '@services/apply.service';
import { NxConfigService, IConfig } from '@services/nx-config';
import { NxLanguageProviderService } from '@services/nx-language-provider';
import { NxProcessService, Process } from '@services/process.service';
import { NxSystem } from '@services/system.service';

@UntilDestroy({ checkProperties: true })
@Component({
    selector: 'nx-server-logger-component',
    templateUrl: 'logger.component.html',
    styleUrls: ['logger.component.scss'],
    encapsulation: ViewEncapsulation.None
})

export class NxServerLoggerComponent implements OnChanges {
    CONFIG: IConfig;
    LANG: LanguageI18NStaticTypes;

    showLoggers: boolean;
    saveLoggers: Process;
    lockedSubscription: SubscriptionLike;
    loading = false;
    formWatcher: FormWatcher;

    @Input() system: NxSystem;
    @Input() serverId;

    @ViewChild('logLevelsForm') logLevelsForm: NgForm;
    loggerWatcher = new Watcher(false)

    systemLoggers: any = {};
    readonly loggerOptions: any = [];
    cancelPrevious$ = new Subject<any>()

    private setupDefaults = () => {
        this.showLoggers = false;

        this.saveLoggers = this.processService.createProcess(() => {
            return this.system
                .serverManager
                .setLogLevels(this.serverId, this.loggersToBeSaved())
                .then((response: any) => {
                    if (
                        typeof (response.error) !== 'undefined' &&
                        response.error !== '0'
                    ) {
                        const errorToShow = response.errorString;
                        this.dialogsService
                            .alert(errorToShow, this.LANG.dialogs.titles.error?.())
                            .catch(error => {
                                console.error(error);
                            });
                    } else {
                        this.dialogsService
                            .alert(
                                this.LANG.dialogs.message.logLevelsSaved?.(),
                                this.LANG.dialogs.titles.success?.()
                            ).catch(error => {
                                console.error(error);
                            });
                        this.formWatcher.saved();
                    }
                }, () => {
                    this.dialogsService
                        .alert(
                            this.LANG.dialogs.message.logLevelsNotSaved?.(),
                            this.LANG.dialogs.titles.error?.()
                        ).catch(error => {
                            console.error(error);
                        });
                });
        });
    }

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
            {
                value: 'none',
                name: this.LANG.system.loggers.none.text(),
                help: this.LANG.system.loggers.none.help()
            },
            {
                value: 'error',
                name: this.LANG.system.loggers.error.text(),
                help: this.LANG.system.loggers.error.help()
            },
            {
                value: 'warning',
                name: this.LANG.system.loggers.warning.text(),
                help: this.LANG.system.loggers.warning.help()
            },
            {
                value: 'info',
                name: this.LANG.system.loggers.info.text(),
                help: this.LANG.system.loggers.info.help()
            },
            {
                value: 'debug',
                name: this.LANG.system.loggers.debug.text(),
                help: this.LANG.system.loggers.debug.help()
            },
            {
                value: 'verbose',
                name: this.LANG.system.loggers.verbose.text(),
                help: this.LANG.system.loggers.verbose.help()
            }
        ];

        this.setupDefaults();
    }

    ngOnChanges(changes: SimpleChanges): void {
        if (changes.serverId?.previousValue) {
            this.init();
        }
    }

    init = () => {
        this.system.serverManager
            .logLevel(this.serverId).toPromise()
            .then(response => {
                this.settingsToBeDisplayedOrUpdated(response.reply);
                this.showLoggers = (Object.keys(this.systemLoggers).length > 1);
                this.loading = false;
            }).catch(console.error);
    }

    ngAfterViewInit() {
        this.init();
    }

    ngOnDestroy() {
        // cleans up formWatcher.valueSubject subscribe
        this.cancelPrevious$.next('cancel');
    }

    changeLog(selected, key) {
        this.systemLoggers[key].value = selected.value;
        this.systemLoggers[key].selected = selected;
    }

    settingsToBeDisplayedOrUpdated = (loggers) => {
        this.formWatcher = new FormWatcher(this.logLevelsForm);
        const reset = () => {
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
    }

    loggersToBeSaved() {
        const loggers = [];

        Object.keys(this.systemLoggers).forEach((key) => {
            if (
                this.systemLoggers[key].value !==
                this.systemLoggers[key].originalValue
            ) {
                loggers.push({ ...this.systemLoggers[key], key });
            }
        });
        return loggers;
    }
}
