import { Component, OnInit } from '@angular/core';
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

import { LanguageI18NStaticTypes } from '@app/language_i18n_static_types';
import { environment } from '@environments/environment';
import { NxAccountService } from '@services/account.service';
import { NxAppStateService } from '@services/nx-app-state.service';
import type { IConfig } from '@services/nx-config/config-types';
import { NxConfigService } from '@services/nx-config/nx-config.service';
import { NxLanguageProviderService } from '@services/nx-language-provider';
import type { NxSystem } from '@services/system.service/system';
import { NxSystemService } from '@services/system.service/system.service';

interface Server {
    name: string,
    ip: string,
    id: string,
    url: string,
    status: string
}

@UntilDestroy({ checkProperties: true })
@Component({
    selector: 'nx-overlay-modal',
    templateUrl: 'overlay-modal.component.html',
    styleUrls: ['overlay-modal.component.scss']
})
export class NxOverlayModalComponent implements OnInit {
    system: NxSystem;
    CONFIG: IConfig;
    LANG: LanguageI18NStaticTypes;
    servers: Partial<Server>[] = [];

    currentRoute: string = '';
    serverId: string;
    nextInterval = 10;
    // can remove once we can stop multiple logins upon system coming back online
    oneCheckAtATime = false;
    showOverlay = false;
    refreshMessage: string;

    timeoutUntilRefresh$ = new BehaviorSubject(5);
    checking$ = new BehaviorSubject(false);
    private refresh$ = new Subject();

    routeSubscription: Subscription;
    systemAvailableSubscription: Subscription;
    checkingSubscription: Subscription;

    constructor(
        configService: NxConfigService,
        languageService: NxLanguageProviderService,
        public appState: NxAppStateService,
        private systemService: NxSystemService,
        private accountService: NxAccountService,
        private router: Router,
        private localStorage: LocalStorageService
    ) {
        this.CONFIG = configService.getConfig();
        this.LANG = languageService.translations;
    }

    ngOnInit(): void {
        if (this.localStorage.retrieve('resetServer') === true) {
            setTimeout(() => window.location.reload(), 2000);
        }
        this.systemAvailableSubscription = this.appState.systemAvailable$.subscribe(async state => {
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
            this.refreshMessage = this.LANG?.servers[state ? 'refreshing' : 'refresh']();
        });

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

    setupObservers() {
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
                    .then((res: any) => {
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

    getServers() {
        this.system.serverManager.getServers().toPromise()
            .then(res => {
                this.servers = (<Server[]>(res as unknown) || [])
                    .filter(({ id }) => id !== this.serverId);
            })
            .catch(err => console.error(err));
    }

    manualRefresh() {
        this.oneCheckAtATime = false;
        this.checking$.next(true);
        this.timeoutUntilRefresh$.next(0);
        this.nextInterval = 10;
        this.refresh$.next('refresh');
    }

    checkIfOnline() {
        this.oneCheckAtATime = true;
        return this.system.mediaserver.getModuleInfo().toPromise();
    }
}
