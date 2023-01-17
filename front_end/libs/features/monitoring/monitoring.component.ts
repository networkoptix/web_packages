import {
    Component, OnInit,
} from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import {
    UntilDestroy, untilDestroyed,
} from '@ngneat/until-destroy';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { NxMenuService } from '@app/menu/menu.service';
import { Content } from '@app/menu/menu.types';
import staticLang from '@common/language/language_i18n_static.json';
import { DropdownItem } from '@components/dropdowns/generic/dropdown.component.types';
import { icons, menus } from '@lib/variables/static-variables';
import { NxAccountService } from '@services/account.service';
import { Account } from '@services/account.service/account';
import { NxAppSourceService } from '@services/nx-app-source.service';
import { NxPageService } from '@services/page.service';
import { NxSystem } from '@services/system.service/system';
import { NxSystemService } from '@services/system.service/system.service';

import { NxMonitoringService } from './monitoring.service';

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
    availServers: DropdownItem<string>[] = [];
    selectedServer: DropdownItem<string>;
    systemOnline: boolean = true;
    systemId: string;
    icons = icons;

    private destroy$ = new Subject<true>();

    constructor(
        private pageService: NxPageService,
        private route: ActivatedRoute,
        private menuService: NxMenuService,
        private sourceService: NxAppSourceService,
        private monitoringService: NxMonitoringService,
        private accountService: NxAccountService,
        private systemService: NxSystemService,
    ) {
        this.pageService.pageTitle(this.LANG.pageTitles.monitoring);

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
                }, {
                    id: menus.systemMonitoring.logs.id,
                    svg: menus.systemMonitoring.logs.icon,
                    label: this.LANG.menu.titles.logs,
                    path: menus.systemMonitoring.logs.path,
                }
            ]
        };

        this.menuService.selectedSectionSubject
            .pipe(untilDestroyed(this))
            .subscribe(selection => {
                setTimeout(() => {
                    this.pageService.pageTitle(this.LANG.pageTitles.monitoring);
                });
                if (this.content.selectedSection === selection) {
                    return;
                }
                this.content.selectedSection = selection;
                this.content = { ...this.content }; // trigger onChange
            });
    }

    private updateMonitor(system: NxSystem): void {
        this.availServers = [];
        // this.selectedServer = undefined;

        system.serverManager.servers.forEach(server => {
            this.availServers.push({
                value: server.id,
                name: server.name,
                disabled: server.status !== 'Online'
            });

            if (!this.selectedServer) {
                this.selectedServer = { value: server.id, name: server.name, disabled: false };
                this.monitoringService.selectedServerId = server.id;
            }

            if (
                this.selectedServer.value === server.id &&
                this.selectedServer.disabled !== (server.status !== 'Online')
            ) {
                this.selectedServer.disabled = (server.status !== 'Online');
                this.monitoringService.selectedServerId =
                    this.selectedServer.disabled
                        ? undefined
                        : server.id; // trigger onChange
            }
        });

        this.monitoringService.system = system;
    }

    ngOnInit(): void {
        this.route.params
            .pipe(untilDestroyed(this))
            .subscribe(params => {
                this.systemId = params.systemId;
                this.init();
            });
    }

    init(): void {
        this.accountService.get().then(account => {
            if (!account) {
                return;
            }

            this.destroy$.next(true);
            this.system = undefined;
            this.monitoringService.system = undefined;
            this.monitoringService.selectedServerId = undefined;

            this.system = this.systemService.getCurrentSystem();
            this.systemOnline = this.system.isOnline;

            if (this.systemOnline) {
                this.system.serverManager.initSystemMediaServers()
                    .then(() => {
                        this.system.infoSubject
                            .pipe(
                                untilDestroyed(this),
                                takeUntil(this.destroy$)
                            )
                            .subscribe(() => {
                                this.updateMonitor(this.system);
                            });
                    });
            }

            this.content.base = this.sourceService.getMonitoringMenuBase(this.system);
            this.content = { ...this.content }; // trigger onChange
        });
    }

    changeSelectedServer(item: DropdownItem<string>): void {
        this.selectedServer = item;
        this.monitoringService.selectedServerId = item.value;
    }
}
