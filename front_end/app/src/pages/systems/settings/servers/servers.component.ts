import { Component, OnDestroy, OnInit }  from '@angular/core';
import { ActivatedRoute, Params }        from '@angular/router';
import { Location }                      from '@angular/common';
import { UntilDestroy }                  from '@ngneat/until-destroy';
import { Subscription }                  from 'rxjs';
import { delay, filter, map, retryWhen } from 'rxjs/operators';

import { NxConfigService, IConfig }      from '../../../../services/nx-config';
import { NxLanguageProviderService }     from '../../../../services/nx-language-provider';
import { NxSettingsService }             from '../settings.service';
import { NxMenuService }                 from '../../../../menu';
import { NxSystem }                      from '../../../../services/system.service';
import { NxUtilsService }                from '../../../../services/utils.service';
import { NxUriService }                  from '../../../../services/uri.service';
import { LanguageI18NStaticTypes }       from '../../../../../language_i18n_static_types';

@UntilDestroy({ checkProperties: true })
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
        this.menuService.section = 'servers';
    }

    constructor(
        configService: NxConfigService,
        language: NxLanguageProviderService,
        private route: ActivatedRoute,
        private settingsService: NxSettingsService,
        private menuService: NxMenuService,
        private uriService: NxUriService,
        private location: Location
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
                    this.advanced = (this.params.advanced !== undefined);

                    this.serverIdFromParams = routeParams.serverId
                        .replace('%7B', '{')
                        .replace('%7D', '}');

                    if (this.serverIdFromParams.indexOf('?') > -1) {
                        this.serverIdFromParams = this.serverIdFromParams.substring(0, this.serverIdFromParams.indexOf('?'));
                    }

                    this.menuService.detail = this.serverIdFromParams;

                    this.setServer();
                }
            });

        this.systemSubscription = this.settingsService.systemSubject
            .pipe(filter(data => data !== undefined))
            .subscribe((system) => {
                this.isOffline = !system.isOnline;
                this.settingsService.footerSubject.next(true);

                if (!system.permissions?.editUsers) {
                    this.uriService
                        .navigateSystem(`${this.CONFIG.menus.systemSettings.baseUrl}SYSTEM_ID`, system)
                        .catch(error => {
                            console.error(error);
                        });

                    return;
                }
                if (system && (!this.system || !this.CONFIG.isLocal)) {
                    this.system = system;
                    (
                        this.CONFIG.isLocal
                            ? this.system.update()
                            : Promise.resolve()
                    ).then(() => this.system.getInfoAndPermissions(false).catch(() => {}));
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
                    return server.id === `{${this.serverIdFromParams}}`;
                });
            }
            if (typeof server === 'undefined') {
                if (this.system.servers.length > 0 || this.CONFIG.isLocal && this.location.path() === '/settings/servers') {
                    server = this.system.servers[0];
                    const id = NxUtilsService.cleanId(server.id);
                    let path = this.CONFIG.menus.systemSettings.baseUrl;
                    path += (this.CONFIG.isLocal) ? '' : `${this.system.id}`;
                    path += `/servers/${id}`;

                    this.uriService
                        .updateURI(path, {}, true)
                        .catch(error => {
                            console.error(error);
                        });
                } else {
                    return;
                }
            }

            server.osName = server.osInfo ? JSON.parse(server.osInfo).platform : this.LANG.common.unknown;
            if (!server.ip) {
                NxUtilsService.formatURL(server);
            }
            this.selectedServer = server;
            this.menuService.detail = this.selectedServer.id;
        }
    }
}
