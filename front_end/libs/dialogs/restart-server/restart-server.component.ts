import { Component, Input, Injector, Inject } from '@angular/core';
import { timer } from 'rxjs';
import {
    delayWhen,
    retryWhen,
    map,
    tap,
    mergeMap
} from 'rxjs/operators';

import staticLang from '@common/language/language_i18n_static.json';
import { NxRibbonService } from '@components/ribbon/ribbon.service';
import { DIALOG_DATA, DialogRef } from '@dialogs/dialog-ref';
import { NxDialogsService } from '@dialogs/dialogs.service';
import { NxToastService } from '@dialogs/toast.service';
import { environment } from '@environments/environment';
import { maxNumberServerChecked, servers, toast } from '@lib/variables/static-variables';
import { NxApplyService } from '@services/apply.service';
import { NxLoginService } from '@services/login.service';
import { NxProcessService } from '@services/process.service';
import { Process } from '@services/process.service/process';
import type { NxSystem } from '@services/system.service/system';
import { WINDOW } from '@services/window-provider';
import { pickFrom } from '@utils/general';

@Component({
    selector: 'nx-modal-restart-server-content',
    templateUrl: 'restart-server.component.html',
    styleUrls: []
})
export class RestartServerModalContent {
    @Input() closable: boolean = true;

    LANG = staticLang;

    system: NxSystem;
    serverName: string;
    serverId: string;
    needsUpdate: boolean;
    restartServer: Process;
    private applyService: NxApplyService;

    constructor(
        private loginService: NxLoginService,
        private processService: NxProcessService,
        private dialogs: NxDialogsService,
        private ribbonService: NxRibbonService,
        private toastService: NxToastService,
        public dialogRef: DialogRef,
        @Inject(DIALOG_DATA) private dialogData: {
            system: NxSystem;
            serverName: string;
            serverId: string;
        },
        @Inject(WINDOW) private window: Window,
        injector: Injector,
    ) {
        setTimeout(() => {
            this.applyService = injector.get(NxApplyService);
        }, 0);
    }

    ngOnInit(): void {
        pickFrom(this.dialogData, ['system', 'serverName', 'serverId'], this);

        this.restartServer = this.processService
            .createProcess(() => {
                const haveOnlineServers = this.system.servers
                    .some(({ status, id }) =>
                        status === 'Online' && id !== this.serverId
                    );
                if (!haveOnlineServers) {
                    this.ribbonService.show(
                        this.LANG.ribbon.systemOffline,
                        [],
                        'alert',
                        undefined,
                        true
                    );
                }
                this.applyService.isOnline$.next(haveOnlineServers);
                this.system.isAvailable = false;
                return this.system.serverManager.restartServer(this.serverId);
            },
            { ignoreError: true },
            () => {
                /**
                         * Potential post restart scenarios
                         * When 1 server:
                         *  -- goes offline + returns val.status === 502 || 503 (triggered in mergeMap system.getInfo)
                         *
                         * When more than 1 server (at least one other server in system online):
                         *     when there's more than one server, generally another online server will respond
                         *       potentially, if the "main" server was restarted, system might just go offline and act like above (When 1 server)
                         *  Normal potential scenarios:
                         *  -- restarted server goes offline right away (triggers 'still restarting' Error)
                         *     once the server comes back online, usually within 10-20 seconds
                         *     then goes to mergeMap system.getinfo to wait for system to come back online
                         *  -- restarted server stays online & then goes offline at least once
                         *     triggers !serverHasGoneOfflineOnce while online
                         *     then waits for server to go offline
                         *     once server comes back online, goes to checking whether system is back online
                         *  -- restarted server stays online & never goes offline
                         *     if server stays online for more than ~24 seconds (serverOnline < 6)
                         *       then skips to system online check
                         *  -- there might be an instance where after server comes back online, system shows online, but then system goes offline again
                         *     --> not sure how we can handle this
                         */
                this.system.currentBusyServerIds.add(this.serverId);
                this.close(servers.status.restarting);
                let systemOfflineShown = false;
                let serverHasGoneOfflineOnce = false;
                let serverOnlineChecked = 0;
                const serverSubscription = this.system.serverManager.getForceServers(false)
                    .pipe(
                        map(res => {
                            if (res) {
                                // maps server status into serverObj
                                const serverObj: { id?: string } = {};
                                Object.entries(res).forEach((server: [
                                        string,
                                        { id: string; status: string }
                                    ]) => {
                                    serverObj[server[1].id] = server[1].status;
                                });
                                if (!serverObj[this.serverId]) {
                                    throw Error('server not found');
                                }
                                if (serverObj[this.serverId] === 'Offline') {
                                    serverHasGoneOfflineOnce = true;
                                    throw Error('still restarting');
                                }
                                if (
                                    !serverHasGoneOfflineOnce ||
                                        serverOnlineChecked < maxNumberServerChecked
                                ) {
                                    serverOnlineChecked++;
                                    throw Error('still in the process of restarting');
                                }
                            } else {
                                serverHasGoneOfflineOnce = true;
                                throw Error('no response yet');
                            }
                        }),
                        mergeMap(() => {
                            if (environment.isLocal) {
                                // give the user chance to read the toaster
                                setTimeout(() => this.window.location.reload(), 2000);
                                throw Error('re-login on restart');
                            }
                            // makes sure that system is online
                            return this.system.getInfo(true, false)
                                .then(() => {
                                    if (!this.system.isOnline) {
                                        this.ribbonService.show(
                                            this.LANG.ribbon.systemOffline,
                                            [],
                                            'alert',
                                            undefined,
                                            true
                                        );
                                        throw Error('system is offline still');
                                    }
                                })
                                .catch(err => {
                                    throw Error(err);
                                });
                        }),
                        retryWhen(errors => {
                            /** If single server system or only online server, system goes offline
                                 * systemOfflineShown used to stop block from running constantly while offline
                                 * Otherwise, catches all other errors and retries every 4 seconds */
                            return errors.pipe(
                                tap(val => {
                                    if (
                                        !systemOfflineShown &&
                                            [502, 503].includes(val.status)
                                    ) {
                                        systemOfflineShown = true;
                                        serverHasGoneOfflineOnce = true;
                                        this.ribbonService.show(
                                            this.LANG.ribbon.systemOffline,
                                            [],
                                            'alert',
                                            undefined,
                                            true
                                        );
                                    }
                                }),
                                delayWhen(() => timer(4000))
                            );
                        })
                    )
                    .subscribe(() => {
                        this.system.isAvailable = true;
                        this.ribbonService.hide();
                        if (this.system.currentBusyServerIds.has(this.serverId)) {
                            this.system.currentServerNotBusy = true;
                            this.system.currentBusyServerIds.delete(this.serverId);
                        }
                        this.system.systemInfo = this.system;

                        serverSubscription.unsubscribe();
                    });
            },
            err => {
                this.system.currentServerNotBusy = true;
                this.system.currentBusyServerIds.delete(this.serverId);
                this.system.isAvailable = true;
                let message = this.LANG.servers.restartFailed;

                if (err && (err.name === 'TimeoutError' || err.status === 503)) {
                    message = this.LANG.servers.serverOffline;
                    this.close(servers.status.offline);
                    this.toastService.notify(message, toast.warning);
                } else if (err.errorId === servers.errors.oldSessionErrorId) {
                    this.needsUpdate = true;
                    this.loginService.currentSystem = this.system;
                    this.loginService.updateSession('restart')
                        .then(ready => {
                            this.needsUpdate = !ready;
                            if (ready) {
                                this.restartServer.run();
                            }
                        });
                } else if (err.status === 403 || err.errorId === servers.errors.unauthorized) {
                    return this.dialogs.expiredSession().then(() => this.window.location.reload());
                } else {
                    this.toastService.notify(message, toast.warning);
                }
            });
    }

    close = (msg?: string): void => {
        this.dialogRef.close(msg);
    };
}
