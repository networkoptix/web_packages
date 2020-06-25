import { Component, OnInit }         from '@angular/core';
import { UntilDestroy }              from '@ngneat/until-destroy';
import { NxConfigService, IConfig }  from '../../services/nx-config';
import { NxLanguageProviderService } from '../../services/nx-language-provider';
import { NxAppStateService }         from '../../services/nx-app-state.service';
import { LanguageI18NStaticTypes }   from '../../../language_i18n_static_types';
import { NxSystem, NxSystemService } from '../../services/system.service';
import { NxAccountService }          from '../../services/account.service';
import {
    Subscription, from, of, Observable, Subject, BehaviorSubject, interval, empty
}                                    from 'rxjs';
import { delay, concatMap, tap, distinctUntilChanged, switchMap }     from 'rxjs/operators';

interface Server {
    name: string,
    ip: string,
    id: string,
    status: string
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
    servers: Partial<Server>[] = [
        {
            name : 'WIN_ULT',
            ip   : '172.16.0.151'
        },
        {
            name : 'WIN_ULT',
            ip   : '172.16.0.151'
        },
        {
            name : 'WIN_ULT',
            ip   : '172.16.0.151'
        },
        {
            name : 'WIN_ULT',
            ip   : '172.16.0.151'
        },
        {
            name : 'WIN_ULT',
            ip   : '172.16.0.151'
        },
        {
            name : 'WIN_ULT',
            ip   : '172.16.0.151'
        }
    ];

    // intervals: number[] = [];
    serverId: string;
    // refreshText: string;
    // systemAvailable = false;
    
    timeoutUntilRefresh$ = new BehaviorSubject(0);
    checking$ = new BehaviorSubject(false);
    private refresh$ = new Subject();

    get systemAvailable() {
        return this.appState.systemAvailable$.value;
    }

    get refreshText() {
        return this.LANG.servers[this.checking$.value ? 'refreshing' : 'refresh']();
    }

    // systemAvailableSubscription: Subscription;
    // refreshTrackerSubscription: Subscription;
    // refreshTracker: Observable<any>;

    constructor(
        configService: NxConfigService,
        languageService: NxLanguageProviderService,
        private appState: NxAppStateService,
        private systemService: NxSystemService,
        private accountService: NxAccountService
    ) {
        this.CONFIG = configService.getConfig();
        this.LANG = languageService.translations;
        // this.refreshText = this.LANG.servers.refresh();
    }

    ngOnInit() {
        // let seconds = 5;
        // while (seconds <= 60) {
        //     this.intervals.push(seconds);
        //     seconds += 5;
        // }

        // this.refreshTracker = from(this.intervals).pipe(
        //     concatMap(interval => {
        //         this.interval = interval;
        //         return of('').pipe(
        //             delay(interval * 1000),
        //             tap(() => this.checkIfOnline())
        //         );
        //     })
        // );

        this.accountService.get().then(account => {
            const system = this.systemService.createLocalSystem(this.accountService.mediaServerApi, account.id, account.email);
            system.update().then(() => {
                system.getInfoAndPermissions().then(() => {
                    this.system = system;
                    this.getServers();
                    this.serverId = this.system.moduleInfo.id;
                    // this.refreshTrackerSubscription = this.refreshTracker.subscribe();
                });
            });
        });

        this.setupObservers();

        // this.systemAvailableSubscription = this.appState.systemAvailable$
        //     .subscribe((status: boolean) => {
        //         this.systemAvailable = status;
        //     });
    }

    /**
     * This is a pretty basic implementation but it should be a good starting point. Needs to be updated
     * to handle triggering first refresh and is pretty verbose right now for readability but could probably
     * be refactored or left verbose. Sometimes observables that get really abstracted out can do some really
     * complex behavior in just a couple lines of code but it's easy to abstract it so much that it's hard to
     * understand what's going on so it's kind of a balance.
     */
    setupObservers() {
        this.refresh$.pipe(
            // Whenever refresh emits this switches to a new interval observable.
            switchMap(_ => interval(1000))
        ).subscribe((timesIntervalCalled) => {
            const untilRefresh = this.timeoutUntilRefresh$.value;

            if (untilRefresh < 1) {
                this.checkIfOnline().then(() => {
                    // This restarts the interval after checkIfOnline
                    this.refresh$.next('refresh');
                    // Resets the refresh counter
                    this.timeoutUntilRefresh$.next(5);
                });
            } else {
                // This decrements the refresh counter
                this.timeoutUntilRefresh$.next(untilRefresh ? untilRefresh - 1 : 5);
            }
        });

        this.appState.systemAvailable$.pipe(
            // This starts an interval of the time between refresh attempts if systemAvailable
            switchMap((systemAvailable) => systemAvailable ? empty() : interval(5000))
        ).subscribe(timesIntervalTriggered => {
            this.refresh$.next('refresh');
            console.log(timesIntervalTriggered);
        });
    }

    getServers() {
        return this.system.getServers().toPromise()
            .then(res => {
                this.servers = res ? Object.entries(res).map(server => server[1]) : [];
                return this.servers;
            })
            .catch(err => console.error(err));
    }

    manualRefresh() {
        this.refresh$.next('refresh');
    }

    checkIfOnline() {
        this.checking$.next(true);
        return this.getServers().finally(() => {
            this.checking$.next(false);
            this.timeoutUntilRefresh$.next(5);
        });
        // if (reset) {
        //     this.refreshTrackerSubscription.unsubscribe();
        // }
        // this.checking = true;
        // this.refreshText = this.LANG.servers.refreshing();
        // return this.getServers()
        //     .then((servers: Partial<Server>[]) => {
        //         let available = false;
        //         if (servers.length) {
        //             const server = servers.find(server => server.id === this.serverId);
        //             available = server && server.status !== 'Online';
        //         }
        //         this.appState.systemAvailable$.next(available);
        //     })
        //     .catch(err => {
        //         console.error(err);
        //         this.appState.systemAvailable$.next(false);
        //     })
        //     .finally(() => {
        //         setTimeout(() => {
        //             this.checking = false;
        //             this.refreshText = this.LANG.servers.refresh();
        //             if (reset) {
        //                 this.refreshTrackerSubscription = this.refreshTracker.subscribe();
        //             }
        //         }, this.CONFIG.servers.checkStatusTimeout);
        //     });
    }
}
