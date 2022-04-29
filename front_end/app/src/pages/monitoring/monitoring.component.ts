import {
    Component, OnInit,
} from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import {
    UntilDestroy, untilDestroyed,
} from '@ngneat/until-destroy';

import { DropdownItem } from '@components/dropdowns/generic/dropdown.component.types';
import { environment } from '@environments/environment';
import { NxAccountService } from '@services/account.service';
import { Account } from '@services/account.service/account';
import { NxAppSourceService } from '@services/nx-app-source.service';
import { NxSystem } from '@services/system.service/system';
import { NxSystemService } from '@services/system.service/system.service';
import { NxMenuService } from '@src/menu/menu.service';

import { Content } from '../../menu/menu.types';

import { NxMonitoringService } from './monitoring.service';

@UntilDestroy()
@Component({
    selector: 'nx-monitoring',
    styleUrls: ['monitoring.component.scss'],
    templateUrl: 'monitoring.component.html',
})
export class NxMonitoringComponent implements OnInit {
    content: Content;
    system: NxSystem;
    account: Account;
    availServers: DropdownItem<string>[] = [];
    selectedServer: DropdownItem<string>;
    systemOnline: boolean = true;
    systemId: string;

    constructor(
        private route: ActivatedRoute,
        private menuService: NxMenuService,
        private sourceService: NxAppSourceService,
        private monitoringService: NxMonitoringService,
        private accountService: NxAccountService,
        private systemService: NxSystemService,
    ) {
        this.content = {
            base: '',
            selectedSection: 'graphs',
            selectedSubSection: '',
            level1: [
                {
                    id: 'graphs',
                    svg: 'system',
                    label: 'Graphs',
                    path: '',
                }, {
                    id: 'logs',
                    svg: 'server',
                    label: 'Logs',
                    path: 'logs',
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

    ngOnInit() {
        this.route.params
            .pipe(untilDestroyed(this))
            .subscribe(params => {
                this.systemId = params.systemId;
                this.systemId && this.init();
            });
    }

    init() {
        this.accountService.get().then(account => {
            if (!account) {
                return;
            }

            this.availServers = [];
            this.selectedServer = undefined;
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

            this.systemOnline = system.isOnline;
            if (this.systemOnline) {
                system.update().then(() => {
                    system.serverManager.servers.forEach(server => {
                        this.availServers.push({
                            value: server.id,
                            name: server.name,
                            disabled: server.status !== 'Online'
                        });

                        if (
                            server.status === 'Online' &&
                            (!this.selectedServer || !Object.keys(this.selectedServer).length)
                        ) {
                            this.selectedServer = { value: server.id, name: server.name, disabled: false };
                            this.monitoringService.selectedServerId = server.id;
                        }
                    });

                    system.serverManager.initSystemMediaServers()
                        .then(() => {
                            this.system = system;
                            this.monitoringService.system = this.system;
                        });

                    this.content.base = this.sourceService.getMonitoringMenuBase(system);
                    this.content = { ...this.content }; // trigger onChange
                });
            }
        });
    }

    changeSelectedServer(item) {
        this.selectedServer = item;
        this.monitoringService.selectedServerId = item.value;
    }
}
