import { Component, Inject, OnInit } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { UntilDestroy } from '@ngneat/until-destroy';
import { LocalStorageService } from 'ngx-webstorage';
import {
    Subject,
    BehaviorSubject,
    interval,
    empty,
    Subscription
} from 'rxjs';
import { distinctUntilChanged, switchMap } from 'rxjs/operators';

import staticLang from '@common/language/language_i18n_static.json';
import { environment } from '@environments/environment';
import { NxAccountService } from '@services/account.service';
import { NxAppStateService } from '@services/nx-app-state.service';
import type { IConfig } from '@services/nx-config/config-types';
import { NxConfigService } from '@services/nx-config/nx-config.service';
import type { ModuleInformation } from '@services/system-api.types';
import type { NxSystem } from '@services/system.service/system';
import type { NxSystemServer } from '@services/system.service/system-types';
import { NxSystemService } from '@services/system.service/system.service';
import { WINDOW } from '@services/window-provider';

@UntilDestroy({ checkProperties: true })
@Component({
    selector: 'nx-overlay-modal',
    templateUrl: 'overlay-modal.component.html',
    styleUrls: ['overlay-modal.component.scss']
})
export class NxOverlayModalComponent implements OnInit {
    system: NxSystem;
    CONFIG: IConfig;
    LANG = staticLang;
    servers: NxSystemServer[] = [];

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

    routeSubscription: Subscription;
    systemAvailableSubscription: Subscription;
    checkingSubscription: Subscription;

    constructor(
        configService: NxConfigService,

        public appState: NxAppStateService,
        private systemService: NxSystemService,
        private accountService: NxAccountService,
        private router: Router,
        private localStorage: LocalStorageService,
        @Inject(WINDOW) private window: Window,
    ) {
        this.CONFIG = configService.getConfig();
    }

    ngOnInit(): void {
        if (this.localStorage.retrieve('resetServer') === true) {
            setTimeout(() => {
                this.localStorage.store('resetServer', false);
                this.window.location.reload();
            }, 2000);
        }
        this.systemAvailableSubscription = this.appState.systemAvailable$.subscribe(async state => {
            /* Temporary patch for Firefox-specific behavior where a false state is emitted
            before a true state after successful login, which results in a overlay flash

            Caused by errors when getting login sessions, which is intercepted by
            LocalSystemStatusInterceptor on FF right after successful login and sets
            appState.systemAvailable$ to false

            This should be removed once the underlying issue is fixed
            https://networkoptix.atlassian.net/browse/CLOUD-9674
            */
            if (!state && !this.system) {
                return;
            }

            if (!state && this.system?.serverManager.servers.length > 1) {
                // mainServer.status is unreliable ...
                // if system availability state was changed to FALSE -> check if current server is available
                !this.showOverlay && await this.checkIfOnline().catch(
                    () => {
                        this.showOverlay = true;
                    });
            } else {
                this.showOverlay = !state;
            }
        });

        this.checkingSubscription = this.checking$.subscribe(state => {
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
                account.email
            );
            system.update().then(() => {
                this.system = system;
                this.currentRoute = `/#${this.router.url}`;
                this.getServers();
                this.serverId = (environment.isLocal)
                    ? this.CONFIG.localServerId
                    : this.system.moduleInfo.id;
                this.routeSubscription = this.router.events.subscribe(route => {
                    if (route instanceof NavigationEnd) {
                        this.currentRoute = `/#${route.url}`;
                    }
                });
            });
        });

        this.setupObservers();
    }

    setupObservers(): void {
        this.refresh$.pipe(
            // Whenever refresh emits this switches to a new interval observable.
            switchMap(res => {
                return !res
                    ? empty()
                    : this.appState.systemAvailable$.value ? empty() : interval(1000);
            })
        ).subscribe(() => {
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
            .pipe(distinctUntilChanged())
            .subscribe(systemAvailable => {
                if (
                    !systemAvailable &&
                    this.appState.lastErrorStatus$.value === 504
                ) {
                    this.system.stopPoll();
                }

                this.timeoutUntilRefresh$.next(5);
                this.refresh$.next('refresh');
            });
    }

    getServers(): void {
        this.system.serverManager.getServers().toPromise()
            .then(res => {
                this.servers = (res || []).filter(({ id }) => id !== this.serverId);
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
        return this.system.mediaserver.getModuleInfo().toPromise();
    }
}
