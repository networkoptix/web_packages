import { Component, OnInit } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { LocalStorageService } from 'ngx-webstorage';
import { BehaviorSubject, empty, firstValueFrom, interval, Subject } from 'rxjs';
import { distinctUntilChanged, switchMap } from 'rxjs/operators';

import { environment } from '@environments/environment';
import staticLang from '@language_static';
import { NxAccountService } from '@services/account.service';
import { NxAppStateService } from '@services/nx-app-state.service';
import type { IConfig } from '@services/nx-config/config-types';
import { NxConfigService } from '@services/nx-config/nx-config.service';
import type { ModuleInformation } from '@services/system-api.types/servers.types';
import type { NxSystem } from '@services/system.service/system';
import { NxSystemService } from '@services/system.service/system.service';
import type { NxSystemServer } from '@services/system.service/types/servers.types';

@UntilDestroy()
@Component({
    selector: 'nx-overlay-modal',
    templateUrl: 'overlay-modal.component.html',
    styleUrls: ['overlay-modal.component.scss'],
})
export class NxOverlayModalComponent implements OnInit {
    system: NxSystem;
    CONFIG: IConfig;
    LANG = staticLang;
    servers: (NxSystemServer & { url: string })[] = [];

    currentRoute: string = '';
    serverId: string;
    nextInterval = 10;
    // can remove once we can stop multiple logins upon system coming back online
    oneCheckAtATime = false;
    showOverlay = false;
    refreshMessage: string;

    timeoutUntilRefresh$ = new BehaviorSubject(5);
    checking$ = new BehaviorSubject(false);
    private refresh$ = new Subject<'refresh' | false>();

    // routeSubscription: Subscription;
    // systemAvailableSubscription: Subscription;
    // checkingSubscription: Subscription;

    constructor(
        configService: NxConfigService,

        public appState: NxAppStateService,
        private systemService: NxSystemService,
        private accountService: NxAccountService,
        private router: Router,
        private localStorage: LocalStorageService,
    ) {
        this.CONFIG = configService.getConfig();
    }

    ngOnInit(): void {
        if (this.localStorage.retrieve('resetServer') === true) {
            setTimeout(() => {
                this.localStorage.store('resetServer', false);
                window.location.reload();
            }, 2000);
        }
        this.appState.systemAvailable$.pipe(untilDestroyed(this)).subscribe(async state => {
            if (!state && this.system?.serverManager.servers.length > 1) {
                // mainServer.status is unreliable ...
                // if system availability state was changed to FALSE -> check if current server is available
                if (!this.showOverlay) {
                    await this.checkIfOnline().catch(() => {
                        this.showOverlay = true;
                    });
                }
            } else {
                this.showOverlay = !state;
            }
        });

        this.checking$.pipe(untilDestroyed(this)).subscribe(state => {
            this.refreshMessage = this.LANG?.servers[state ? 'refreshing' : 'refresh'];
        });

        if (this.CONFIG.newSystem) {
            return;
        }
        this.accountService.get().then(account => {
            if (!account) {
                return;
            }
            const system = this.systemService.createLocalSystem(
                this.accountService.mediaServerApi,
                account.id,
                account.email,
            );
            system.update().then(() => {
                this.system = system;
                this.currentRoute = `/#${this.router.url}`;
                this.getServers();
                this.serverId = environment.isLocal
                    ? this.CONFIG.localServerId
                    : this.system.serverManager.moduleInfo.id;
                this.router.events.pipe(untilDestroyed(this)).subscribe(route => {
                    if (route instanceof NavigationEnd) {
                        this.currentRoute = `/#${route.url}`;
                    }
                });
            });
        });

        this.setupObservers();
    }

    setupObservers(): void {
        this.refresh$
            .pipe(
                // Whenever refresh emits this switches to a new interval observable.
                switchMap(res => {
                    return !res
                        ? empty()
                        : this.appState.systemAvailable$.value
                          ? empty()
                          : interval(1000);
                }),
            )
            .pipe(untilDestroyed(this))
            .subscribe(() => {
                const untilRefresh = this.timeoutUntilRefresh$.value;

                if (!this.oneCheckAtATime && untilRefresh < 1) {
                    this.checkIfOnline()
                        .then(res => {
                            this.oneCheckAtATime = false;
                            // restarts the interval after checkIfOnline
                            if (!res.reply && this.nextInterval <= 60) {
                                this.timeoutUntilRefresh$.next(this.nextInterval);
                                this.nextInterval += 5;
                                this.refresh$.next('refresh');
                            } else {
                                this.refresh$.next(false);

                                if (res.reply) {
                                    this.appState.systemAvailable$.next(true);
                                    this.system.startPoll();
                                    // poll subscription is lost when server goes offline
                                }
                            }
                        })
                        .catch(err => {
                            console.error('Server still offline: ', err);
                        })
                        .finally(() => {
                            this.checking$.next(false);
                            this.refresh$.next(false);
                        });
                } else if (!this.oneCheckAtATime) {
                    this.timeoutUntilRefresh$.next(untilRefresh - 1);
                    if (untilRefresh === 1) {
                        this.checking$.next(true);
                    }
                }
            });

        this.appState.systemAvailable$
            .pipe(distinctUntilChanged(), untilDestroyed(this))
            .subscribe(systemAvailable => {
                if (!systemAvailable && this.appState.lastErrorStatus$.value === 504) {
                    this.system.stopPoll();
                }

                this.timeoutUntilRefresh$.next(5);
                this.refresh$.next('refresh');
            });
    }

    getServers(): void {
        firstValueFrom(this.system.serverManager.getServers())
            .then(res => {
                this.servers = (res || [])
                    .filter(({ id }) => id !== this.serverId)
                    .map(server => ({
                        ...server,
                        url: `//${server.ip}${server.port ? ':' + server.port : ''}`,
                    }));
            })
            .catch(err => console.error(err));
    }

    manualRefresh(): void {
        this.oneCheckAtATime = false;
        this.checking$.next(true);
        this.timeoutUntilRefresh$.next(0);
        this.nextInterval = 10;
        this.refresh$.next('refresh');
    }

    checkIfOnline(): Promise<ModuleInformation> {
        this.oneCheckAtATime = true;
        return firstValueFrom(this.system.mediaserver.getModuleInfo());
    }
}
