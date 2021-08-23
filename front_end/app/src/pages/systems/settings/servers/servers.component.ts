import { Component, OnDestroy, OnInit, ViewContainerRef, Inject }  from '@angular/core';
import { ActivatedRoute, Params }        from '@angular/router';
import { Location }                      from '@angular/common';
import { UntilDestroy, untilDestroyed }  from '@ngneat/until-destroy';
import { BehaviorSubject, timer }        from 'rxjs';
import { delay, filter, map, retryWhen, switchMap, tap } from 'rxjs/operators';

import { NxConfigService, IConfig }      from '../../../../services/nx-config';
import { NxLanguageProviderService }     from '../../../../services/nx-language-provider';
import { NxSettingsService }             from '../settings.service';
import { NxApplyService }                from '../../../../services/apply.service';
import { NxMenuService }                 from '../../../../menu';
import { NxSystem }                      from '../../../../services/system.service';
import { NxUtilsService }                from '../../../../services/utils.service';
import { NxUriService }                  from '../../../../services/uri.service';
import { LanguageI18NStaticTypes }       from '../../../../../language_i18n_static_types';
import { NxProcessService }              from '../../../../services/process.service';
import { WINDOW }                        from '@services/window-provider';

@UntilDestroy()
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
    serverId$ = new BehaviorSubject('')

    advanced: boolean;
    params: Params;
    isOffline = false;
    serverLoaded = false;
    storagesOutdated = false;

    private setupDefaults() {
        this.menuService.section = 'servers';
    }

    constructor(
        configService: NxConfigService,
        language: NxLanguageProviderService,
        private route: ActivatedRoute,
        private applyService: NxApplyService,
        private settingsService: NxSettingsService,
        private menuService: NxMenuService,
        private processService: NxProcessService,
        private uriService: NxUriService,
        private location: Location,
        @Inject(WINDOW) private window: Window,
        @Inject(ViewContainerRef) public applyContainerRef: ViewContainerRef
    ) {
        this.CONFIG = configService.getConfig();
        this.LANG = language.translations;
        this.setupDefaults();
    }

    ngOnInit(): void {
        this.route.params.pipe(
            untilDestroyed(this)
        ).subscribe(({ serverId }) => {
            if (!serverId) {
                return;
            }
            this.params = this.route.snapshot.queryParams;
            this.advanced = (this.params.advanced !== undefined);

            this.serverIdFromParams = serverId
                .replace('%7B', '{')
                .replace('%7D', '}');

            if (this.serverIdFromParams.indexOf('?') > -1) {
                this.serverIdFromParams = this.serverIdFromParams.substring(0, this.serverIdFromParams.indexOf('?'));
            }

            this.menuService.detail = this.serverIdFromParams;

            this.setServer(true);

            // remove when storages update with normal 30 second poll
            timer(60000).subscribe(() => {
                this.storagesOutdated = true;
            });
        });

        this.applyService.initPageWatcher(this.applyContainerRef);

        this.settingsService.systemSubject
            .pipe(
                filter(data => data !== undefined),
                switchMap(async(system: any) => {
                    this.isOffline = !system.isOnline;
                    this.settingsService.footerSubject.next(true);
                    if (system && (!this.system || !this.CONFIG.isLocal)) {
                        if (system.isOnline && system.isAvailable) {
                            await system?.apiVersionResolved$.toPromise();
                        }
                        this.system = system;
                    }
                }),
                tap(() => {
                    if (!this.system.isAvailable) {
                        this.isOffline = true;
                    }
                    if (this.system && !this.system.userManager.permissions?.isAdmin) {
                        this.uriService
                            .navigateSystem(`${this.CONFIG.menus.systemSettings.baseUrl}SYSTEM_ID`, this.system)
                            .catch(error => {
                                console.error(error);
                            });
                    }
                }),
                switchMap(() => this.system.infoSubject.pipe(
                    map(system => {
                        if (!system.serverManager.servers || system.serverManager.servers.length === 0) {
                            throw system;
                        }
                        return system;
                    }),
                    retryWhen(err => err.pipe(delay(1000)))
                )),
                switchMap(async() => {
                    if (this.system.currentServerNotBusy) {
                        this.system.serverManager
                            .initSystemMediaServers()
                            .then(() => {
                                this.setServer(false);
                            })
                            .catch(error => {
                                console.error(error);
                            });
                    }
                }),
                untilDestroyed(this)
            ).subscribe();
    }

    ngOnDestroy() {
        this.applyService.removeWatchers();
    }

    hideAdvancedSettings() {
        const queryParams: Params = {};
        queryParams.advanced = undefined;

        this.uriService
            .updateURI(this.uriService.getURL(), queryParams, true)
            .then(() => {
                this.advanced = false;
            });
    }

    setServer(initWatcher = true): void {
        if (initWatcher) {
            this.applyService.initPageWatcher(this.applyContainerRef);
        }
        if (this.system && this.system.servers && this.system.servers.length > 0) {
            let server;
            if (this.serverIdFromParams) {
                server = this.system.serverManager.servers.find((server: any) => {
                    return server.id === `{${this.serverIdFromParams}}`;
                });
            }
            if (typeof server === 'undefined') {
                if (this.system.serverManager.servers.length > 0 || this.CONFIG.isLocal && this.location.path() === '/settings/servers') {
                    server = this.system.serverManager.servers[0];
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

            server.osName = server.osInfo ? JSON.parse(server.osInfo).platform : this.LANG.common.unknown?.();
            if (!server.ip) {
                NxUtilsService.formatURL(server);
            }
            this.selectedServer = server;
            this.menuService.detail = this.selectedServer.id;
            if (this.selectedServer.id !== this.serverId$.value) {
                this.serverId$.next(this.selectedServer.id);
                this.system.storageManager.serverId = this.selectedServer.id;
            }
        }
    }
}
