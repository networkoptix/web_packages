import {
    Component, OnInit, Inject,
    ViewContainerRef, OnDestroy
}                                     from '@angular/core';
import {
    filter, map, delay,
    retryWhen
}                                     from 'rxjs/operators';
import { Subscription }               from 'rxjs';
import { ActivatedRoute }             from '@angular/router';
import { NxConfigService, IConfig }   from '../../../../services/nx-config';
import { NxDialogsService }           from '../../../../dialogs/dialogs.service';
import { NxSettingsService }          from '../settings.service';
import { NxLanguageProviderService }  from '../../../../services/nx-language-provider';
import { NxMenuService }              from '../../../../components/menu/menu.service';
import { NxProcessService }           from '../../../../services/process.service';
import { NxSystem }                   from '../../../../services/system.service';
import { NxApplyService, ObjWatcher } from '../../../../services/apply.service';
import { NxUriService }               from '../../../../services/uri.service';
import { AutoUnsubscribe }            from 'ngx-auto-unsubscribe';
import { LanguageI18NStaticTypes }    from '../../../../../language_i18n_static_types';

@AutoUnsubscribe()
@Component({
    selector    : 'nx-server-advanced-component',
    templateUrl : 'advanced.component.html',
    styleUrls   : ['advanced.component.scss']
})

export class NxSystemServerAdvancedComponent implements OnInit, OnDestroy {
    CONFIG: IConfig;
    LANG: LanguageI18NStaticTypes;
    system: NxSystem;
    viewContainerRef: ViewContainerRef;
    serverIdFromParams: any;
    selectedServer: any;

    systemSettings: any;

    private serverSubscription: Subscription;
    private systemSubscription: Subscription;
    private routeParamsSubscription: Subscription;

    settingsWatcher: any = new ObjWatcher<Object>();
    saveSettings: any;
    previousInputValue: number;
    checking: boolean;

    renameDisabled: boolean;
    serverOffline: boolean;
    canSeeInfo: boolean;
    parsedServerId: string;

    constructor(
        configService: NxConfigService,
        language: NxLanguageProviderService,
        @Inject(ViewContainerRef) viewContainerRef,
        private applyService: NxApplyService,
        private processService: NxProcessService,
        private route: ActivatedRoute,
        private dialogs: NxDialogsService,
        private settingsService: NxSettingsService,
        private menuService: NxMenuService,
        private uriService: NxUriService,
        private dialogsService: NxDialogsService
    ) {
        this.viewContainerRef = viewContainerRef;
        this.CONFIG = configService.getConfig();
        this.LANG = language.getTranslations();
    }

    ngOnInit(): void {
        this.routeParamsSubscription = this.route
            .params
            .subscribe(params => {
                if (params.serverId) {
                    this.menuService.setDetailsSection(params.serverId);
                    this.serverIdFromParams = params.serverId;
                    this.parsedServerId = params.serverId.replace(/\s|\{|\}/g, '');
                    this.setServer();
                }
            });

        this.systemSubscription = this.settingsService.systemSubject
            .pipe(filter(data => data !== undefined))
            .subscribe((system) => {
                this.settingsService.footerSubject.next(true);
                this.system = system;
                this.applyService.setVisible(false);
                this.initApplyService();

                if (this.serverSubscription) {
                    this.serverSubscription.unsubscribe();
                }
                this.serverSubscription = this.system.infoSubject
                    .pipe(
                        map(system => {
                            if (!system.servers || system.servers.length === 0) {
                                throw system;
                            }
                        }),
                        retryWhen(err => err.pipe(delay(1000)))
                    )
                    .subscribe(() => {
                        this.settingsService.footerSubject.next(true);
                        if (this.system.currentServerNotBusy) {
                            if (this.system && this.system.servers && this.system.servers.length) {
                                this.getAdvancedSettings();
                            }
                            if (!this.applyService.locked) {
                                this.setServer();
                            }
                        }
                    });
            });
    }

    ngOnDestroy(): void {
    }

    setServer(): void {
        if (this.system && this.system.servers && this.system.servers.length > 0) {
            let server;
            if (this.serverIdFromParams) {
                server = this.system.servers.find((server: any) => {
                    return server.id === this.serverIdFromParams;
                });
            }
            if (typeof server === 'undefined') {
                if (this.system.servers.length > 0) {
                    server = this.system.servers[0];

                    this.uriService
                        .updateURI(`systems/${this.system.id}/servers/${server.id}`)
                        .catch(error => {
                            console.error(error);
                        });
                } else {
                    return;
                }
            }

            server.osName = server.osInfo !== '' ? JSON.parse(server.osInfo).platform : this.LANG.common.unknown;
            this.selectedServer = server;
            this.menuService.setDetailsSection(this.selectedServer.id);
        }
    }

    getAdvancedSettings() {
        this.system.updateOrGetSystemSettings({ ignore: 'installedUpdateInformation,targetUpdateInformation' })
            .toPromise()
            .then(response => {
                this.systemSettings = Object.keys(response.reply.settings)
                    .map((key, value) => {
                        return {
                            key, value: response.reply.settings[key]
                        };
                    });

                this.systemSettings.forEach(setting => {
                    if (!this.CONFIG.settingsConfig[setting.key]) {
                        let type = 'text';
                        if (setting.value === true ||
                            setting.value === false ||
                            setting.value === 'true' ||
                            setting.value === 'false') {
                            type = 'checkbox';
                        }
                        this.CONFIG.settingsConfig[setting.key] = { label: setting.key, type: type };
                    }

                    if (this.CONFIG.settingsConfig[setting.key].type === 'number') {
                        this.systemSettings[setting.key] = parseInt(setting.value);
                    }
                    if (this.systemSettings[setting.key] === 'true') {
                        this.systemSettings[setting.key] = true;
                    }
                    if (this.systemSettings[setting.key] === 'false') {
                        this.systemSettings[setting.key] = false;
                    }

                    this.CONFIG.settingsConfig[setting.key].oldValue = setting.value;
                });

                this.setWatcherValues(this.systemSettings);
            });
    }

    setWatcherValues(settings: {}) {
        this.applyService.setVisible(false);
        this.applyService.hardReset();

        this.settingsWatcher = [ ...this.systemSettings ];

        // const sw = this.settingsWatchers;
        // Object.keys(sw).forEach(setting => {
        //     if (setting in settings) {
        //         let curr = settings[setting];
        //         /**
        //          * sets initial values for system & security settings
        //          * sessionLimitMinutes is the only one that's a number & not a boolean,
        //          * so it needs custom code to handle
        //          */
        //         if (isNaN(curr)) {
        //             sw[setting].value = curr === 'true';
        //         } else {
        //             curr = parseInt(curr);
        //             this.sessionLimitToggle = Boolean(curr);
        //             this.selectedTimeUnit = this.limitSessionTimeUnits.minutes;
        //
        //             sw[setting].value = curr;
        //             this.timeValue = curr;
        //             if (this.timeValue % 60 === 0) {
        //                 this.timeValue /= 60;
        //                 this.selectedTimeUnit = this.limitSessionTimeUnits.hours;
        //             }
        //         }
        //     }
        // });
        // this.settingsWatchersSet = true;
        this.applyService.reset();
        this.applyService.setVisible(true);
    }

    initApplyService(): void {
        this.saveSettings = this.processService.createProcess(() => {
            return this.system
                .updateOrGetSystemSettings(this.systemSettings)
                .toPromise()
                .then(response => {
                    this.applyService.reset();
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

        this.applyService
            .initPageWatcher(this.viewContainerRef, this.saveSettings, () => {
                this.applyService.reset();
            },
            [this.settingsWatcher]);

        this.applyService.setVisible(false);
    }
}
