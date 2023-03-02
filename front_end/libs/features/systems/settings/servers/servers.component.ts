import { Location } from '@angular/common';
import {
    Component,
    OnDestroy,
    OnInit,
    ViewContainerRef,
    Inject,
} from '@angular/core';
import { ActivatedRoute, Params, Router } from '@angular/router';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { BehaviorSubject, Observable, Subject, Subscription, timer } from 'rxjs';
import { delay, filter, map, retryWhen, switchMap, tap } from 'rxjs/operators';

import { NxMenuService } from '@app/menu/menu.service';
import staticLang from '@common/language/language_i18n_static.json';
import { environment } from '@environments/environment';
import { icons, menus } from '@lib/variables/static-variables';
import { NxApplyService } from '@services/apply.service';
import type { NxSystem } from '@services/system.service/system';
import type { NxSystemServer } from '@services/system.service/system-types';
import { NxUriService } from '@services/uri.service';
import { WINDOW } from '@services/window-provider';
import { cleanId } from '@utils/general';

import { NxSettingsService } from '../settings.service';

@UntilDestroy()
@Component({
    selector: 'nx-server-component',
    templateUrl: 'servers.component.html',
    styleUrls: ['servers.component.scss']
})

export class NxSystemServersComponent implements OnInit, OnDestroy {
    readonly environment = environment;
    LANG = staticLang;
    system: NxSystem;
    serverIdFromParams: string;
    _selectedServer$: Subject<NxSystemServer> = new Subject<NxSystemServer>();
    selectedServer$: Observable<NxSystemServer> = this._selectedServer$.pipe(delay(100)); // debouncing the server input
    storageTimer: Subscription;
    serverId$ = new BehaviorSubject<string>('');

    advanced: boolean;
    isOffline: boolean = false;
    isServerOffline: boolean = false;
    serverLoaded: boolean = false;
    storagesOutdated: boolean = false;
    icons = icons;

    constructor(
        private route: ActivatedRoute,
        private router: Router,
        private applyService: NxApplyService,
        private settingsService: NxSettingsService,
        private menuService: NxMenuService,
        private uriService: NxUriService,
        private location: Location,
        @Inject(WINDOW) public window: Window,
        @Inject(ViewContainerRef) public applyContainerRef: ViewContainerRef
    ) {
    }

    ngOnInit(): void {
        this.menuService.section = 'servers';

        this.route.params
            .pipe(untilDestroyed(this))
            .subscribe(({ serverId }: { serverId: string }) => {
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

                if (this.isServerOffline) {
                    this.storagesOutdated = false;
                    this.storageTimer?.unsubscribe();
                    this.storageTimer = undefined;
                }

                this.menuService.detail = this.serverIdFromParams;
                if (this.storageTimer) {
                    this.storageTimer.unsubscribe();
                    this.storageTimer = undefined;
                }

                this.storagesOutdated = false;
                this.setServer(true);
            });

        this.route.queryParams
            .pipe(untilDestroyed(this))
            .subscribe(params => {
                this.advanced = (params.advanced !== undefined);
            });

        if (!this.advanced) {
            this.advanced = this.router.url.includes(`servers/${this.route.snapshot.params.serverId}/advanced`);
        }

        this.applyService.initPageWatcher(this.applyContainerRef);

        this.settingsService.systemSubject
            .pipe(
                filter(data => data !== undefined),
                switchMap(async system => {
                    this.isOffline = !system.isOnline;
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
                                `${menus.systemSettings.baseUrl}SYSTEM_ID`,
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
                            throw new Error();
                        }
                        return system;
                    }),
                    retryWhen(err => err.pipe(delay(1000)))
                )),
                switchMap(async () => {
                    this.system.serverManager
                        .initSystemMediaServers()
                        .then(() => {
                            this.setServer(false);
                        })
                        .catch(error => {
                            console.error(error);
                        });
                }),
                untilDestroyed(this)
            ).subscribe();
    }

    ngOnDestroy(): void {
        this.applyService.removeWatchers();
    }

    hideAdvancedSettings(): void {
        const queryParams: Params = {};
        queryParams.advanced = undefined;

        this.uriService
            .updateURI(this.uriService.getURL(), queryParams, true)
            .then(() => {
                this.advanced = false;
            });
    }

    setServer(initWatcher: boolean = true): void {
        if (initWatcher) {
            this.applyService.initPageWatcher(this.applyContainerRef);
        }
        if (
            this.system?.serverManager?.servers &&
            this.system.serverManager.servers.length > 0
        ) {
            let server: NxSystemServer;
            if (this.serverIdFromParams) {
                server = this.system.serverManager.servers.find(server =>
                    server.id === `{${this.serverIdFromParams}}`
                );
            }
            if (server === undefined) {
                if (
                    this.system.serverManager.servers.length > 0 ||
                    this.environment.isLocal && this.location.path() === '/settings/servers'
                ) {
                    server = this.system.serverManager.servers[0];
                    const id = cleanId(server.id);
                    let path = menus.systemSettings.baseUrl;
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

            this._selectedServer$.next(server);
            this.isServerOffline = (server.status === 'Offline');

            if (!this.isServerOffline && !this.storageTimer) {
                // remove when storages update with normal 30 second poll
                this.storageTimer = timer(60000)
                    .pipe(untilDestroyed(this))
                    .subscribe(() => {
                        this.storagesOutdated = true;
                    });
            }

            this.menuService.detail = server.id;
            if (server.id !== this.serverId$.value) {
                this.serverId$.next(server.id);
                this.system.storageManager.serverId = server.id;
            }
        }
    }
}
