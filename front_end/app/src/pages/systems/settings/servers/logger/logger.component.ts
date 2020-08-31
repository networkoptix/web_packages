import {
    Component,
    OnDestroy, Input, OnChanges,
    SimpleChanges, ViewEncapsulation, ViewChild, ViewContainerRef
} from '@angular/core';
import { UntilDestroy }              from '@ngneat/until-destroy';
import { SubscriptionLike }          from 'rxjs';

import { NxConfigService, IConfig }  from '../../../../../services/nx-config';
import { NxLanguageProviderService } from '../../../../../services/nx-language-provider';
import { NxProcessService, Process } from '../../../../../services/process.service';
import { NxDialogsService }          from '../../../../../dialogs/dialogs.service';
import { NxSystem }                  from '../../../../../services/system.service';
import { LanguageI18NStaticTypes }                 from '../../../../../../language_i18n_static_types';
import { NxApplyService, SectionWatcher, Watcher } from '../../../../../services/apply.service';

@UntilDestroy({ checkProperties: true })
@Component({
    selector      : 'nx-server-logger-component',
    templateUrl   : 'logger.component.html',
    styleUrls     : ['logger.component.scss'],
    encapsulation : ViewEncapsulation.None
})

export class NxServerLoggerComponent implements OnChanges, OnDestroy {
    CONFIG: IConfig;
    LANG: LanguageI18NStaticTypes;

    loading: boolean;
    showLoggers: boolean;
    lockedSubscription: SubscriptionLike;

    @Input() system: NxSystem;
    @Input() serverId;

    systemLoggers: {[key: string]: Watcher<any> & { key: string, name: string, help: string, selected: string }} = {};
    readonly loggerOptions: any = [];

    @ViewChild('sectionLoggersApply', { read: ViewContainerRef, static: true }) sectionLoggersApply;

    sectionWatcher: SectionWatcher
    saveLoggers: Process;
    resetLoggers = () => {
        Object.values(this.systemLoggers).forEach((watcher: any) => {
            watcher.reset();
            // Update object to trigger dropdown update
            watcher.selected = watcher.value;
            const { value, key, name, help } = watcher;
            this.systemLoggers[key] = Watcher.extendedWatcherFactory(value, {
                key,
                name,
                help,
                selected: value
            });
            this.systemLoggers[watcher.key].value = value;
        });

        if (this.sectionWatcher) {
            this.sectionWatcher = undefined;
        }
        // re-create section watcher
        this.sectionWatcher = this.applyService.createSectionWatcher(
            this.sectionLoggersApply,
            this.saveLoggers,
            this.resetLoggers,
            Object.values(this.systemLoggers)
        );
    };

    private setupDefaults() {
        this.showLoggers = false;

        this.saveLoggers = this.processService.createProcess(() => {
            return this.system
                .setLogLevels(this.serverId, this.loggersToBeSaved())
                .then((response: any) => {
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
        private applyService: NxApplyService,
        private processService: NxProcessService,
        private dialogsService: NxDialogsService
    ) {
        this.CONFIG = configService.getConfig();
        this.LANG = language.translations;

        this.loggerOptions = [
            {
                value : 'none',
                name  : this.LANG.system.loggers.none.text(),
                help  : this.LANG.system.loggers.none.help()
            },
            {
                value : 'error',
                name  : this.LANG.system.loggers.error.text(),
                help  : this.LANG.system.loggers.error.help()
            },
            {
                value : 'warning',
                name  : this.LANG.system.loggers.warning.text(),
                help  : this.LANG.system.loggers.warning.help()
            },
            {
                value : 'info',
                name  : this.LANG.system.loggers.info.text(),
                help  : this.LANG.system.loggers.info.help()
            },
            {
                value : 'debug',
                name  : this.LANG.system.loggers.debug.text(),
                help  : this.LANG.system.loggers.debug.help()
            },
            {
                value : 'verbose',
                name  : this.LANG.system.loggers.verbose.text(),
                help  : this.LANG.system.loggers.verbose.help()
            }
        ];

        this.setupDefaults();
    }

    ngOnChanges(changes: SimpleChanges): void {
        if (changes.serverId?.currentValue) {
            this.loading = true;
            this.systemLoggers = {};

            this.system
                .logLevel(changes.serverId.currentValue)
                .then(response => {
                    if (response.name !== 'TimeoutError') {
                        this.settingsToBeDisplayedOrUpdated(response.reply);
                    }

                    this.showLoggers = (Object.keys(this.systemLoggers).length > 1);
                    this.loading = false;
                })
                .catch(error => {
                    console.error(error);
                });
        }
    }

    ngOnDestroy(): void {
    }

    changeLog(selected, key) {
        this.systemLoggers[key].value = selected.value;
        this.systemLoggers[key].selected = selected.value;
    }

    // ... Breadcrumbs ... TT
    // @ViewChild('logLevelsForm') logLevelsForm;

    // ngAfterViewInit() {
        // debugger;
    // }

    settingsToBeDisplayedOrUpdated(loggers) {
        Object.keys(loggers).forEach((key) => {
            const value = loggers[key];
            const { name, help } = this.loggerOptions.filter(level => {
                return level.value === value;
            })[0];

            this.systemLoggers[key] = Watcher.extendedWatcherFactory(value, { key, name, help, selected: value });
            this.systemLoggers[key].value = value;
            this.systemLoggers[key].originalValue = value;
        });

        // ... Breadcrumbs ... TT
        // this.applyService.createFormWatcher(
        //     this.sectionLoggersApply,
        //     this.logLevelsForm,
        //     this.saveLoggers);

        this.sectionWatcher = this.applyService.createSectionWatcher(
            this.sectionLoggersApply,
            this.saveLoggers,
            this.resetLoggers,
            Object.values(this.systemLoggers)
        );

        this.applyService.addWatchersAndFunctionsFromChild([this.sectionWatcher], this.saveLoggers, this.resetLoggers);
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
