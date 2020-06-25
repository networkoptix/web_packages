import { Component, OnInit }         from '@angular/core';
import { UntilDestroy }              from '@ngneat/until-destroy';
import { NxConfigService, IConfig }  from '../../services/nx-config';
import { NxLanguageProviderService } from '../../services/nx-language-provider';
import { NxAppStateService }         from '../../services/nx-app-state.service';
import { LanguageI18NStaticTypes }   from '../../../language_i18n_static_types';
import { NxSystem, NxSystemService } from '../../services/system.service';
import { NxAccountService }          from '../../services/account.service';
import {
    Subscription, from, of, Observable
}                                    from 'rxjs';
import { delay, concatMap, tap }     from 'rxjs/operators';

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

    intervals: number[] = [];
    interval: number;
    serverId: string;
    refreshText: string;
    checking = false;
    systemAvailable = false;

    systemAvailableSubscription: Subscription;
    refreshTrackerSubscription: Subscription;
    refreshTracker: Observable<any>;

    constructor(
        configService: NxConfigService,
        languageService: NxLanguageProviderService,
        private appState: NxAppStateService,
        private systemService: NxSystemService,
        private accountService: NxAccountService
    ) {
        this.CONFIG = configService.getConfig();
        this.LANG = languageService.translations;
        this.refreshText = this.LANG.servers.refresh();
    }

    ngOnInit() {
        let seconds = 5;
        while (seconds <= 60) {
            this.intervals.push(seconds);
            seconds += 5;
        }

        this.refreshTracker = from(this.intervals).pipe(
            concatMap(interval => {
                this.interval = interval;
                return of('').pipe(
                    delay(interval * 1000),
                    tap(() => this.checkIfOnline())
                );
            })
        );

        this.accountService.get().then(account => {
            const system = this.systemService.createLocalSystem(this.accountService.mediaServerApi, account.id, account.email);
            system.update().then(() => {
                system.getInfoAndPermissions().then(() => {
                    this.system = system;
                    this.getServers();
                    this.serverId = this.system.moduleInfo.id;
                    this.refreshTrackerSubscription = this.refreshTracker.subscribe();
                });
            });
        });

        this.systemAvailableSubscription = this.appState.systemAvailable$
            .subscribe((status: boolean) => {
                this.systemAvailable = status;
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

    checkIfOnline(reset = false) {
        if (reset) {
            this.refreshTrackerSubscription.unsubscribe();
        }
        this.checking = true;
        this.refreshText = this.LANG.servers.refreshing();
        return this.getServers()
            .then((servers: Partial<Server>[]) => {
                let available = false;
                if (servers.length) {
                    const server = servers.find(server => server.id === this.serverId);
                    available = server && server.status !== 'Online';
                }
                this.appState.systemAvailable$.next(available);
            })
            .catch(err => {
                console.error(err);
                this.appState.systemAvailable$.next(false);
            })
            .finally(() => {
                setTimeout(() => {
                    this.checking = false;
                    this.refreshText = this.LANG.servers.refresh();
                    if (reset) {
                        this.refreshTrackerSubscription = this.refreshTracker.subscribe();
                    }
                }, this.CONFIG.servers.checkStatusTimeout);
            });
    }
}
