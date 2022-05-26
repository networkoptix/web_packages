import {
    Component, OnInit,
} from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import {
    UntilDestroy, untilDestroyed,
} from '@ngneat/until-destroy';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { DropdownItem } from '@components/dropdowns/generic/dropdown.component.types';
import { environment } from '@environments/environment';
import { NxAccountService } from '@services/account.service';
import { Account } from '@services/account.service/account';
import { NxAppSourceService } from '@services/nx-app-source.service';
import { IConfig } from '@services/nx-config/config-types';
import { NxConfigService } from '@services/nx-config/nx-config.service';
import { NxSystem } from '@services/system.service/system';
import { NxSystemService } from '@services/system.service/system.service';
import { NxMenuService } from '@src/menu/menu.service';

import { LanguageI18NStaticTypes } from '../../../language_i18n_static_types';
import { Content } from '../../menu/menu.types';
import { NxLanguageProviderService } from '../../services/nx-language-provider';

import { NxMonitoringService } from './monitoring.service';

@UntilDestroy()
@Component({
    selector: 'nx-monitoring',
    styleUrls: ['monitoring.component.scss'],
    templateUrl: 'monitoring.component.html',
})
export class NxMonitoringComponent implements OnInit {
    CONFIG: IConfig;
    LANG: LanguageI18NStaticTypes;

    content: Content;
    system: NxSystem;
    account: Account;
    availServers: DropdownItem<string>[] = [];
    selectedServer: DropdownItem<string>;
    systemOnline: boolean = true;
    systemId: string;

    private destroy$ = new Subject();

    constructor(
        configService: NxConfigService,
        languageService: NxLanguageProviderService,
        private route: ActivatedRoute,
        private menuService: NxMenuService,
        private sourceService: NxAppSourceService,
        private monitoringService: NxMonitoringService,
        private accountService: NxAccountService,
        private systemService: NxSystemService,
    ) {
        this.LANG = languageService.translations;
        this.CONFIG = configService.getConfig();

        this.content = {
            base: '',
            selectedSection: 'graphs',
            selectedSubSection: '',
            level1: [
                {
                    id: this.CONFIG.menus.systemMonitoring.graphs.id,
                    svg: this.CONFIG.menus.systemMonitoring.graphs.icon,
                    label: this.LANG.menu.titles.graphs(),
                    path: this.CONFIG.menus.systemMonitoring.graphs.path,
                }, {
                    id: this.CONFIG.menus.systemMonitoring.logs.id,
                    svg: this.CONFIG.menus.systemMonitoring.logs.icon,
                    label: this.LANG.menu.titles.logs(),
                    path: this.CONFIG.menus.systemMonitoring.logs.path,
                }
            ]
        };

        this.menuService.selectedSectionSubject
            .pipe(untilDestroyed(this))
            .subscribe(selection => {
                if (this.content.selectedSection === selection) {
                    return;
                }
                this.content.selectedSection = selection;
                this.content = { ...this.content }; // trigger onChange
            });
    }

    private updateMonitor(system) {
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

    ngOnInit() {
        this.route.params
            .pipe(untilDestroyed(this))
            .subscribe(params => {
                this.systemId = params.systemId;
                this.init();
            });
    }

    init() {
        this.accountService.get().then(account => {
            if (!account) {
                return;
            }

            this.destroy$.next();
            this.system = undefined;
            this.monitoringService.system = undefined;
            this.monitoringService.selectedServerId = undefined;

            let system;
            if (environment.isLocal) {
                system = this.systemService.createLocalSystem(
                    this.accountService.mediaServerApi, account.id, account.email
                );
            } else {
                system = this.systemService.createSystem(account.email, this.systemId);
            }

            system.update().then(() => {
                this.systemOnline = system.isOnline;
                if (this.systemOnline) {
                    system.serverManager.initSystemMediaServers()
                        .then(() => {
                            this.system = system;
                            this.system.infoSubject
                                .pipe(
                                    untilDestroyed(this),
                                    takeUntil(this.destroy$)
                                )
                                .subscribe(() => {
                                    this.updateMonitor(this.system);
                                });
                        });

                    this.content.base = this.sourceService.getMonitoringMenuBase(system);
                    this.content = { ...this.content }; // trigger onChange
                }
            });
        });
    }

    changeSelectedServer(item) {
        this.selectedServer = item;
        this.monitoringService.selectedServerId = item.value;
    }
}
