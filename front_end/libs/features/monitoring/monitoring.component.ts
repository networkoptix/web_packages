import { Component, computed, effect, inject, input } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { map, switchMap } from 'rxjs/operators';

import { environment } from '@environments/environment';
import staticLang from '@language_static';
import { NxMenuService } from '@menu/menu.service';
import { Content } from '@menu/menu.types';
import { NxSystem } from '@services/system.service/system';
import { NxSystemServer } from '@services/system.service/types/servers.types';
import { icons, menus } from '@static-variables';
import { useNewCloud } from '@utils/general';
import { paramModel, pipeSignal } from '@utils/signals';
import { NxLayoutComponent } from 'nx-components';

@Component({
    selector: 'nx-monitoring',
    styleUrls: ['monitoring.component.scss'],
    templateUrl: 'monitoring.component.html',
})
export class NxMonitoringComponent {
    readonly LANG = staticLang;
    readonly icons = icons;
    private menuService = inject(NxMenuService);
    useNewCloud = useNewCloud();
    clampEffect = NxLayoutComponent.configureLayout({
        clampSize: 1800,
        viewIdentifier: 'monitoring',
    });

    system = input.required<NxSystem>();
    serverId = paramModel('serverId');
    systemOnline = pipeSignal(
        this.system,
        system$ =>
            system$.pipe(
                takeUntilDestroyed(),
                map(system => system.isOnline),
            ),
        true,
    );
    servers = pipeSignal(
        this.system,
        system$ =>
            system$.pipe(
                takeUntilDestroyed(),
                switchMap(system => system.serverManager.getServers()),
            ),
        [],
    );

    selectedServer = computed<NxSystemServer | undefined>(() => {
        const serverId = this.serverId();
        if (!serverId) {
            return undefined;
        }
        return this.servers().find(server => server.id === serverId);
    });

    content = computed<Content>(() => {
        const permissions = this.system()?.permissionManager.permissions$$() ?? {
            isAdmin: false,
        };
        const serverId = this.serverId() ?? '';
        const selectedSection = this.menuService.selectedSection$$();
        const base = environment.isWebadmin ? '' : menus.systemSettings.baseUrl + this.system().id;
        const content = {
            base: base + menus.systemMonitoring.baseUrl,
            selectedSection: selectedSection || 'graphs',
            selectedSubSection: '',
            level1: [
                {
                    id: menus.systemMonitoring.graphs.id,
                    svg: menus.systemMonitoring.graphs.icon,
                    label: this.LANG.menu.titles.graphs,
                    path: menus.systemMonitoring.graphs.path,
                    params: serverId ? { serverId } : undefined,
                },
            ],
        };
        if (permissions.isAdmin) {
            content.level1.push({
                id: menus.systemMonitoring.logs.id,
                svg: menus.systemMonitoring.logs.icon,
                label: this.LANG.menu.titles.logs,
                path: menus.systemMonitoring.logs.path,
                params: serverId ? { serverId } : undefined,
            });
        }
        return content;
    });

    // After the server is set correctly, the initServer effect is destroyed
    private initServer = effect(
        () => {
            const serverId = this.serverId();
            const servers = this.servers();
            if (!servers?.length) {
                return;
            }
            const selectedServer = servers.find(server => server.id === serverId) || servers[0];
            if (!serverId || serverId !== selectedServer.id) {
                this.serverId.set(selectedServer.id);
            }
            this.initServer.destroy();
        },
        { allowSignalWrites: true },
    );
}
