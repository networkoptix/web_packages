import { Location } from '@angular/common';
import {
    Component,
    OnDestroy,
    OnInit,
    ViewContainerRef,
    Inject,
} from '@angular/core';
import { ActivatedRoute, Params } from '@angular/router';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { BehaviorSubject, timer } from 'rxjs';
import { delay, filter, map, retryWhen, switchMap, tap } from 'rxjs/operators';

import { LanguageI18NStaticTypes } from '@app/language_i18n_static_types';
import { environment } from '@environments/environment';
import { NxApplyService } from '@services/apply.service';
import type { IConfig } from '@services/nx-config/config-types';
import { NxConfigService } from '@services/nx-config/nx-config.service';
import { NxLanguageProviderService } from '@services/nx-language-provider';
import { NxProcessService } from '@services/process.service';
import type { NxSystem } from '@services/system.service/system';
import { NxUriService } from '@services/uri.service';
import { WINDOW } from '@services/window-provider';
import { NxMenuService } from '@src/menu/menu.service';
import { cleanId } from '@utils/general';
import { setServerIpAndPort } from '@utils/nx';

import { NxSettingsService } from '../settings.service';

@UntilDestroy()
@Component({
    selector: 'nx-server-component',
    templateUrl: 'servers.component.html',
    styleUrls: ['servers.component.scss']
})

export class NxSystemServersComponent implements OnInit, OnDestroy {
    CONFIG: IConfig;
    readonly environment = environment;
    LANG: LanguageI18NStaticTypes;
    system: NxSystem;
    serverIdFromParams;
    selectedServer;
    serverId$ = new BehaviorSubject('')

    advanced: boolean;
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
        @Inject(WINDOW) public window: Window,
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

            this.serverIdFromParams = serverId
                .replace('%7B', '{')
                .replace('%7D', '}');

            if (this.serverIdFromParams.includes('?')) {
                this.serverIdFromParams = this.serverIdFromParams.substring(
                    0,
                    this.serverIdFromParams.indexOf('?')
                );
            }

            this.menuService.detail = this.serverIdFromParams;

            this.setServer(true);

            // remove when storages update with normal 30 second poll
            timer(60000).subscribe(() => {
                this.storagesOutdated = true;
            });
        });

        this.route.queryParams
            .pipe(untilDestroyed(this))
            .subscribe(params => {
                this.advanced = (params.advanced !== undefined);
            });

        this.applyService.initPageWatcher(this.applyContainerRef);

        this.settingsService.systemSubject
            .pipe(
                filter(data => data !== undefined),
                switchMap(async (system: any) => {
                    this.isOffline = !system.isOnline;
                    this.settingsService.footerSubject.next(true);
                    if (system && (!this.system || !this.environment.isLocal)) {
                        this.system = system;
                    }
                }),
                tap(() => {
                    if (!this.system.isAvailable) {
                        this.isOffline = true;
                    }
                    if (this.system && !this.system.userManager.permissions?.isAdmin) {
                        this.uriService
                            .navigateSystem(
                                `${this.CONFIG.menus.systemSettings.baseUrl}SYSTEM_ID`,
                                this.system
                            ).catch(error => {
                                console.error(error);
                            });
                    }
                }),
                switchMap(() => this.system.infoSubject.pipe(
                    map(system => {
                        if (
                            !system.serverManager.servers ||
                            system.serverManager.servers.length === 0
                        ) {
                            throw system;
                        }
                        return system;
                    }),
                    retryWhen(err => err.pipe(delay(1000)))
                )),
                switchMap(async () => {
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
                if (
                    this.system.serverManager.servers.length > 0 ||
                    this.environment.isLocal && this.location.path() === '/settings/servers'
                ) {
                    server = this.system.serverManager.servers[0];
                    const id = cleanId(server.id);
                    let path = this.CONFIG.menus.systemSettings.baseUrl;
                    path += (this.environment.isLocal) ? '' : `${this.system.id}`;
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

            server.osName = server.osInfo
                ? JSON.parse(server.osInfo).platform
                : this.LANG.common.unknown?.();
            if (!server.ip) {
                setServerIpAndPort(server);
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
