import { ChangeDetectorRef, Component } from '@angular/core';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { BehaviorSubject, defer, Subject } from 'rxjs';
import { debounceTime, switchMap, shareReplay, map, filter } from 'rxjs/operators';

import { DropdownItem } from '@components/dropdowns/generic/dropdown.component.types';
import { NxAccountService } from '@services/account.service';
import { NxCloudApiService } from '@services/nx-cloud-api';
import { IConfig } from '@services/nx-config/config-types';
import { NxConfigService } from '@services/nx-config/nx-config.service';
import { NxSystemService } from '@services/system.service/system.service';

import { NxHealthMonitorWidgetComponent } from '../health-monitor/health-monitor-widget.component';
import { FirstPartyWidget, WidgetSize } from '../helper-classes';

interface SystemDropdownItem extends DropdownItem<string> {
    disabled: boolean;
}

@UntilDestroy()
@Component({
    selector: 'nx-server-logger-widget',
    templateUrl: './server-logger-widget.component.html',
    styleUrls: ['./server-logger-widget.component.scss']
})
export class NxServerLoggerWidgetComponent extends FirstPartyWidget {
    CONFIG: IConfig;
    static IDENTIFIER = 'server-logger';
    static NAME = 'Server Logger';
    static SIZES = [
        { name: '4 x 6', value: { cols: 4, rows: 6 } },
        { name: '6 x 12', value: { cols: 6, rows: 8 } },
        { name: '12 x 12', value: { cols: 12, rows: 8 } }
    ];

    static BASE_CONFIG = {
        selectedSystem: '',
        selectedServer: '',
        autoRefresh: true,
        refreshInterval: 1000
    };

    static cloudApi: NxCloudApiService;
    static updateSystems$ = new Subject();
    static systemUpdater$ = NxServerLoggerWidgetComponent.updateSystems$.pipe(
        debounceTime(100),
        switchMap(_ => NxServerLoggerWidgetComponent.cloudApi.systems()),
        shareReplay({
            bufferSize: 1,
            refCount: true
        })
    );

    selectedSystem$ = new BehaviorSubject<SystemDropdownItem>(null);
    selectedServer$ = new BehaviorSubject<SystemDropdownItem>(null);
    loading = false;
    isOnline = true;

    systemsDropdownItems$ = this.cloudApi.systems().pipe(
        map(systems => systems.map(({ id: value, name, stateOfHealth }) => ({
            name: stateOfHealth !== 'online' ? `${name} (${stateOfHealth})` : name,
            disabled: stateOfHealth !== 'online',
            value
        }))),
        map(systems => {
            if (!systems.length) {
                return [];
            }
            const selectedSystem = systems.find(({ value }) => value === this.card.config.selectedSystem) || systems.find(({ disabled }) => !disabled) || systems[0];
            this.updateSystem(selectedSystem);
            return systems;
        }),
        shareReplay({
            bufferSize: 1,
            refCount: true
        })
    );

    serversDropdownItems$ = this.selectedSystem$.pipe(
        filter(system => {
            return !!system;
        }),
        map(system => this.systemService.createSystem(this.accountService.email, system.value)),
        switchMap(system => system.update().then(_ => system)),
        switchMap(system => system.serverManager.getServers()),
        map(servers => servers.map(({ id: value, name, status }) => ({
            name: status !== 'Online' ? `${name} (${status})` : name,
            disabled: status !== 'Online',
            value
        })
        )),
        map(servers => {
            if (!servers.length) {
                return [];
            }
            const selectedServer = servers.find(({ value }) => value === this.card.config.selectedSystem) || servers.find(({ disabled }) => !disabled) || servers[0];
            this.updateServer(selectedServer);
            return servers;
        }),
        shareReplay({
            bufferSize: 1,
            refCount: true
        })
    );

    system$ = defer(() => this.getSystem(this.card.config.selectedSystem));

    updateName = (newName: string) => (size: WidgetSize) => {
        size.name = size.name.replace(NxServerLoggerWidgetComponent.NAME, newName);
        return size.name;
    };

    getSystem = async systemId => {
        const system = this.systemService.createSystem(this.accountService.email, systemId);
        await system.update();
        await system.serverManager.initSystemMediaServers();
        const systemName = system.info.name;
        const activeServer = system.servers.find(({ id }) => id === this.card.config.selectedServer);
        this.isOnline = activeServer?.status === 'Online';
        const nameUpdater = this.updateName(
            activeServer ? `${systemName} - ${activeServer.name} (${activeServer.status})${
                this.card.config.refreshInterval && this.card.config.autoRefresh ? ' - ' + this.card.config.refreshInterval + 'ms' : ''
            } -` : systemName);
        this.card.title = nameUpdater(this.card.size);
        this.card.sizes.forEach(nameUpdater);
        return system;
    };

    toggleLoading(): void {
        this.loading = !this.loading;
    }

    updateSystem = (systemDropdown: SystemDropdownItem): void => {
        this.selectedSystem$.next(systemDropdown);
        this.card.config.selectedSystem = systemDropdown.value;
    };

    updateServer = (server: SystemDropdownItem): void => {
        this.selectedServer$.next(server);
        this.card.config.selectedServer = server.value;
    };

    constructor(
        cd: ChangeDetectorRef,
        configService: NxConfigService,
        private cloudApi: NxCloudApiService,
        private accountService: NxAccountService,
        private systemService: NxSystemService
    ) {
        super(cd);
        this.CONFIG = configService.config;
        NxHealthMonitorWidgetComponent.cloudApi = this.cloudApi;
        NxHealthMonitorWidgetComponent.systemUpdater$.pipe(
            untilDestroyed(this)
        ).subscribe(NxHealthMonitorWidgetComponent.systems$);
        NxHealthMonitorWidgetComponent.updateSystems$.next('update');
    }
}

NxServerLoggerWidgetComponent.registerWidget();
