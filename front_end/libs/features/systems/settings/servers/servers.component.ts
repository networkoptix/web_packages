import {
    booleanAttribute,
    Component,
    Inject,
    Input,
    OnChanges,
    OnDestroy,
    OnInit,
    Optional,
    signal,
    ViewContainerRef,
} from '@angular/core';
import { Router } from '@angular/router';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { Subscription, timer } from 'rxjs';
import { delay, map, retryWhen, switchMap } from 'rxjs/operators';

import { createPortalToken } from '@common/tokens';
import { environment } from '@environments/environment';
import staticLang from '@language_static';
import { NxMenuService } from '@menu/menu.service';
import { NxApplyService } from '@services/apply.service';
import type { NxSystem } from '@services/system.service/system';
import type { NxSystemServer } from '@services/system.service/system-types';
import { WINDOW } from '@services/window-provider';
import { icons } from '@static-variables';

@UntilDestroy()
@Component({
    selector: 'nx-server-component',
    templateUrl: 'servers.component.html',
    styleUrls: ['servers.component.scss'],
})
export class NxSystemServersComponent implements OnInit, OnChanges, OnDestroy {
    @Input({ transform: booleanAttribute }) advanced: boolean;
    @Input({ required: true }) system: NxSystem;
    @Input({ required: true }) server: NxSystemServer;
    readonly environment = environment;
    LANG = staticLang;
    storageTimer: Subscription;
    isOffline$$ = signal<boolean>(false);
    isServerOffline$$ = signal<boolean>(false);
    serverId$$ = signal<string>('');
    serverLoaded$$ = signal<boolean>(false);
    storagesOutdated$$ = signal<boolean>(false);
    icons = icons;

    constructor(
        private router: Router,
        private applyService: NxApplyService,
        private menuService: NxMenuService,
        @Inject(WINDOW) public window: Window,
        @Inject(ViewContainerRef) public applyContainerRef: ViewContainerRef,
        @Optional()
        @Inject(
            createPortalToken<
                Pick<NxSystemServersComponent, 'server' | 'system'>,
                NxSystemServersComponent
            >(NxSystemServersComponent),
        )
        private data: Pick<NxSystemServersComponent, 'server' | 'system'>,
    ) {
        if (data) {
            Object.assign(this, this.data);
        }
    }

    ngOnChanges(): void {
        const server = this.server;
        this.system.storageManager.serverId = server.id;
        this.isServerOffline$$.set(server.status === 'Offline');
        this.serverId$$.set(server.id);
        this.menuService.selectedDetailsSection.set(server.id);

        if (this.storageTimer) {
            this.storageTimer.unsubscribe();
            this.storageTimer = undefined;
        }

        if (!this.isServerOffline$$()) {
            this.storagesOutdated$$.set(false);
            this.storageTimer = timer(60000)
                .pipe(untilDestroyed(this))
                .subscribe(() => {
                    this.storagesOutdated$$.set(true);
                });
        }
    }

    ngOnInit(): void {
        this.isOffline$$.set(!this.system.isOnline);
        this.menuService.selectedSection.set('servers');
        this.applyService.initPageWatcher(this.applyContainerRef);
        this.system.infoSubject
            .pipe(
                map(system => {
                    if (
                        !system.serverManager.servers ||
                        system.serverManager.servers.length === 0
                    ) {
                        throw new Error();
                    }
                    return system;
                }),
                retryWhen(err => err.pipe(delay(1000))),
                switchMap(async () => {
                    this.system.serverManager
                        .initSystemMediaServers()
                        .then(() => {
                            // force server-standard component to update current server status
                            this.server = { ...this.server };
                        })
                        .catch(error => {
                            const isOnline = this.system.isOnline;
                            this.isOffline$$.set(!isOnline);
                            this.serverLoaded$$.set(isOnline);
                            console.error(error);
                        });
                }),
                untilDestroyed(this),
            )
            .subscribe();
    }

    ngOnDestroy(): void {
        this.applyService.removeWatchers();
    }

    async hideAdvancedSettings(): Promise<void> {
        if (this.data) {
            return;
        }
        const commands: string[] = [];
        if (this.advanced && this.router.url.includes('/advanced')) {
            commands.push(this.router.url.replace('/advanced', ''));
        }

        await this.router.navigate(commands, {
            queryParamsHandling: 'merge',
            queryParams: { advanced: undefined },
        });
    }
}
