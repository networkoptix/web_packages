import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, NavigationStart, Router } from '@angular/router';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { TranslateService } from '@ngx-translate/core';
import { Subject, filter, takeUntil } from 'rxjs';

import { NxMenuService } from '@app/menu/menu.service';
import { Content } from '@app/menu/menu.types';
import staticLang from '@common/language/language_i18n_static.json';
import { DropdownItem } from '@components/dropdowns/generic/dropdown.component.types';
import { icons, menus } from '@lib/variables/static-variables';
import { NxAccountService } from '@services/account.service';
import { Account } from '@services/account.service/account';
import { NxAppSourceService } from '@services/nx-app-source.service';
import { NxSystem } from '@services/system.service/system';
import { NxSystemService } from '@services/system.service/system.service';

type MonitoringDropdownItem = DropdownItem<string> & {
    serverOffline: boolean;
};

@UntilDestroy()
@Component({
    selector: 'nx-monitoring',
    styleUrls: ['monitoring.component.scss'],
    templateUrl: 'monitoring.component.html',
})
export class NxMonitoringComponent implements OnInit {
    LANG = staticLang;

    content: Content;
    system: NxSystem;
    account: Account;
    selectableServers: MonitoringDropdownItem[] = [];
    selectedServer: MonitoringDropdownItem;
    systemOnline: boolean = true;
    icons = icons;

    private destroy$ = new Subject<true>();

    constructor(
        private route: ActivatedRoute,
        private router: Router,
        private menuService: NxMenuService,
        private sourceService: NxAppSourceService,
        private accountService: NxAccountService,
        private systemService: NxSystemService,
        private translateService: TranslateService,
    ) {
        this.content = {
            base: '',
            selectedSection: 'graphs',
            selectedSubSection: '',
            level1: [
                {
                    id: menus.systemMonitoring.graphs.id,
                    svg: menus.systemMonitoring.graphs.icon,
                    label: this.LANG.menu.titles.graphs,
                    path: menus.systemMonitoring.graphs.path,
                },
                {
                    id: menus.systemMonitoring.logs.id,
                    svg: menus.systemMonitoring.logs.icon,
                    label: this.LANG.menu.titles.logs,
                    path: menus.systemMonitoring.logs.path,
                },
            ],
        };
    }

    private createSelectableServers(): void {
        this.system.serverManager
            .getServers()
            .pipe(untilDestroyed(this), takeUntil(this.destroy$))
            .subscribe(servers => {
                this.selectableServers = servers.map(server => {
                    const serverOffline = server.status !== 'Online';
                    const serverName = serverOffline
                        ? this.translateService.instant(this.LANG.healthMonitor.serverName, {
                              name: server.name,
                          })
                        : server.name;
                    return {
                        value: server.id,
                        name: serverName,
                        serverOffline,
                    };
                });
                this.syncQueryParamWithSelectedServer();
            });
    }

    ngOnInit(): void {
        this.route.params.pipe(untilDestroyed(this)).subscribe(() => {
            this.setSystemValues();
        });
        this.menuService.selectedSectionSubject.pipe(untilDestroyed(this)).subscribe(selection => {
            if (this.content.selectedSection === selection) {
                return;
            }
            this.content.selectedSection = selection;
            this.content = { ...this.content }; // trigger onChange
        });
        // TODO: Menu navigation removes query params. remove this after Menu refactor
        this.router.events
            .pipe(
                untilDestroyed(this),
                filter(event => event instanceof NavigationStart),
            )
            .subscribe((routerEvent: NavigationStart) => {
                if (routerEvent.url.includes('monitoring')) {
                    setTimeout(() => this.syncQueryParamWithSelectedServer());
                }
            });
        this.route.queryParamMap.pipe(untilDestroyed(this)).subscribe(queryParamMap => {
            const routeServerId = queryParamMap.get('serverId');
            const serverFromRouteParam = this.selectableServers.find(
                server => server.value === routeServerId,
            );
            this.selectedServer = serverFromRouteParam || this.selectedServer;
        });
    }

    setSystemValues(): void {
        this.accountService.get().then(account => {
            if (!account) {
                return;
            }

            this.destroy$.next(true);

            this.system = this.systemService.getCurrentSystem();
            this.systemOnline = this.system.isOnline;
            if (this.systemOnline) {
                this.createSelectableServers();
            }

            this.content.base = this.sourceService.getMonitoringMenuBase(this.system);
            this.content = { ...this.content }; // trigger onChange
        });
    }

    changeSelectedServer(item: DropdownItem<string>): void {
        this.router.navigate([], {
            relativeTo: this.route,
            queryParams: {
                serverId: item.value,
            },
        });
    }

    syncQueryParamWithSelectedServer(): void {
        const routeServerId = this.route.snapshot.queryParamMap.get('serverId');
        if (!routeServerId) {
            const serverToSetAsRouteParam = this.selectedServer || this.selectableServers[0];
            this.changeSelectedServer(serverToSetAsRouteParam);
        } else if (!this.selectedServer) {
            const serverFromRouteParam = this.selectableServers.find(
                server => server.value === routeServerId,
            );
            if (serverFromRouteParam) {
                this.selectedServer = serverFromRouteParam;
            } else {
                this.changeSelectedServer(this.selectableServers[0]);
            }
        }
    }
}
