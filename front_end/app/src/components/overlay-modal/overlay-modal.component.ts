import { Component, OnInit }         from '@angular/core';
import { Router, NavigationEnd }     from '@angular/router';
import { UntilDestroy }              from '@ngneat/until-destroy';

import { NxConfigService, IConfig }  from '../../services/nx-config';
import { NxLanguageProviderService } from '../../services/nx-language-provider';
import { NxAppStateService }         from '../../services/nx-app-state.service';
import { LanguageI18NStaticTypes }   from '../../../language_i18n_static_types';
import { NxSystem, NxSystemService } from '../../services/system.service';
import { NxAccountService }          from '../../services/account.service';
import { NxUtilsService }            from '../../services/utils.service';

import {
    Subject, BehaviorSubject, interval, empty, Subscription
}                                          from 'rxjs';
import { distinctUntilChanged, switchMap } from 'rxjs/operators';

interface Server {
    name: string,
    ip: string,
    id: string,
    url: string
}

@UntilDestroy({ checkProperties: true })
@Component({
    selector    : 'nx-overlay-modal',
    templateUrl : 'overlay-modal.component.html',
    styleUrls   : ['overlay-modal.component.scss']
})
export class NxOverlayModalComponent implements OnInit {
    system: NxSystem
    CONFIG: IConfig;
    LANG: LanguageI18NStaticTypes;
    servers: Partial<Server>[] = [];

    serverId: string;
    nextInterval = 10;
    // can remove once we can stop multiple logins upon system coming back online
    oneCheckAtATime = false

    timeoutUntilRefresh$ = new BehaviorSubject(5);
    checking$ = new BehaviorSubject(false);
    private refresh$ = new Subject();

    routeSubscription: Subscription;

    get systemAvailable() {
        return this.appState.systemAvailable$.value;
    }

    get refreshText() {
        return this.LANG.servers[this.checking$.value ? 'refreshing' : 'refresh']();
    }

    constructor(
        configService: NxConfigService,
        languageService: NxLanguageProviderService,
        private appState: NxAppStateService,
        private systemService: NxSystemService,
        private accountService: NxAccountService,
        private router: Router
    ) {
        this.CONFIG = configService.getConfig();
        this.LANG = languageService.translations;
    }

    ngOnInit() {
        this.accountService.get().then(account => {
            const system = this.systemService.createLocalSystem(this.accountService.mediaServerApi, account.id, account.email);
            system.update().then(() => {
                system.getInfoAndPermissions().then(() => {
                    this.system = system;
                    this.getServers();
                    this.serverId = this.system.moduleInfo.id;
                    this.routeSubscription = this.router.events.subscribe(route => {
                        if (route instanceof NavigationEnd) {
                            this.servers.forEach(server => {
                                server.url = `${server.url}/#/${route.url}`;
                            });
                        }
                    });
                });
            });
        });

        this.setupObservers();
    }

    setupObservers() {
        this.refresh$.pipe(
            // Whenever refresh emits this switches to a new interval observable.
            switchMap(res => {
                return !res ? empty()
                    : this.appState.systemAvailable$.value ? empty() : interval(1000);
            })
        ).subscribe(() => {
            const untilRefresh = this.timeoutUntilRefresh$.value;

            if (!this.oneCheckAtATime && untilRefresh < 1) {
                this.checkIfOnline().then(res => {
                    this.oneCheckAtATime = false;
                    // restarts the interval after checkIfOnline
                    if (!res && this.nextInterval <= 60) {
                        this.timeoutUntilRefresh$.next(this.nextInterval);
                        this.nextInterval += 5;
                        this.refresh$.next('refresh');
                    } else {
                        this.refresh$.next(false);
                    }
                });
            } else {
                this.timeoutUntilRefresh$.next(untilRefresh - 1);
                if (untilRefresh === 1) {
                    this.checking$.next(true);
                }
            }
        });

        this.appState.systemAvailable$
            .pipe(distinctUntilChanged())
            .subscribe(() => {
                this.refresh$.next('refresh');
            });
    }

    getServers() {
        return this.system.getServers().toPromise()
            .then(res => {
                this.servers = res
                    ? Object.entries(res)
                        .map(server => {
                            const updatedServer = server[1];
                            updatedServer.url = `${updatedServer.url}/#/${this.router.url}`;
                            return updatedServer;
                        })
                        .filter(server => server.id !== this.serverId)
                    : [];
                return this.servers;
            })
            .catch(err => console.error(err));
    }

    manualRefresh() {
        this.checking$.next(false);
        this.timeoutUntilRefresh$.next(5);
        this.nextInterval = 10;
        this.refresh$.next('refresh');
    }

    checkIfOnline() {
        this.oneCheckAtATime = true;
        return this.getServers()
            .then(res => res)
            .finally(() => {
                this.checking$.next(false);
            });
    }
}
