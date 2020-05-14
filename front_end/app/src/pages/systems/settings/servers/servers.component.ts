import { Component, OnDestroy, OnInit }  from '@angular/core';
import { ActivatedRoute, Params }        from '@angular/router';
import {
    NxConfigService, IConfig,
    NxLanguageProviderService, NxSystem,
    NxProcessService, NxUtilsService,
    NxApplyService, NxUriService
}      from '../../../../services';
import { NxDialogsService }              from '../../../../dialogs';
import { NxSettingsService }             from '../settings.service';
import { NxMenuService }                 from '../../../../menu';
import { LanguageI18NStaticTypes }       from '../../../../../language_i18n_static_types';
import { Subscription }                  from 'rxjs';
import { delay, filter, map, retryWhen } from 'rxjs/operators';
import { AutoUnsubscribe }               from 'ngx-auto-unsubscribe';

@AutoUnsubscribe()
@Component({
    selector    : 'nx-server-component',
    templateUrl : 'servers.component.html',
    styleUrls   : ['servers.component.scss']
})

export class NxSystemServersComponent implements OnInit, OnDestroy {
    CONFIG: IConfig;
    LANG: LanguageI18NStaticTypes;
    system: NxSystem;
    serverIdFromParams;
    selectedServer;

    advanced: boolean;
    params: Params;
    isOffline = false;

    private serverSubscription: Subscription;
    private systemSubscription: Subscription;
    private routeParamsSubscription: Subscription;

    private setupDefaults() {
        this.params = this.route.snapshot.queryParams;
        this.advanced = (this.params.advanced !== undefined);

        this.menuService.setSection('servers');
    }

    constructor(
        configService: NxConfigService,
        language: NxLanguageProviderService,
        private applyService: NxApplyService,
        private processService: NxProcessService,
        private route: ActivatedRoute,
        private dialogs: NxDialogsService,
        private settingsService: NxSettingsService,
        private menuService: NxMenuService,
        private uriService: NxUriService
    ) {
        this.CONFIG = configService.getConfig();
        this.LANG = language.translations;

        this.setupDefaults();
    }

    ngOnInit(): void {
        this.routeParamsSubscription = this.route
            .params
            .subscribe(routeParams => {
                if (routeParams.serverId) {
                    this.params = this.route.snapshot.queryParams;

                    this.serverIdFromParams = routeParams.serverId
                        .replace('%7B', '{')
                        .replace('%7D', '}');

                    if (this.serverIdFromParams.indexOf('?') > -1) {
                        this.serverIdFromParams = this.serverIdFromParams.substring(0, this.serverIdFromParams.indexOf('?'));
                    }

                    this.menuService.setDetailsSection(this.serverIdFromParams);

                    this.setServer();
                }
            });

        this.systemSubscription = this.settingsService.systemSubject
            .pipe(filter(data => data !== undefined))
            .subscribe((system) => {
                this.isOffline = !system.isOnline;
                this.settingsService.footerSubject.next(true);

                if (!system.permissions || !system.permissions.editUsers) {
                    this.uriService
                        .updateURI('systems/' + this.system.id, {})
                        .catch(error => {
                            console.error(error);
                        });

                    return;
                }
                if (system) {
                    this.system = system;
                    this.system
                        .getInfoAndPermissions(false)
                        .catch(() => {});
                }
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
                        if (this.system.currentServerNotBusy) {
                            if (this.system && this.system.servers && this.system.servers.length) {
                                this.system
                                    .initSystemMediaServers()
                                    .catch(error => {
                                        console.error(error);
                                    });
                            }

                            this.setServer();
                        }
                    });
            });
    }

    ngOnDestroy(): void {}

    hideAdvancedSettings() {
        const queryParams: Params = {};
        queryParams.advanced = undefined;

        this.uriService
            .updateURI(this.uriService.getURL(), queryParams, true)
            .then(() => {
                this.advanced = false;
            });
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
            if (!server.ip) {
                NxUtilsService.formatURL(server);
            }
            this.selectedServer = server;
            this.menuService.setDetailsSection(this.selectedServer.id);
        }
    }
}
