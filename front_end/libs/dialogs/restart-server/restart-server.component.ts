import { DialogRef, DIALOG_DATA } from '@angular/cdk/dialog';
import { Component, Inject } from '@angular/core';
import { timer } from 'rxjs';
import { delayWhen, retryWhen, map, tap, mergeMap } from 'rxjs/operators';

import staticLang from '@common/language/language_i18n_static.json';
import { NxRibbonService } from '@components/ribbon/ribbon.service';
import { ToastType } from '@components/toast-container/toast.types';
import { NxDialogsService } from '@dialogs/dialogs.service';
import type { RestartServer as DT } from '@dialogs/dialogs.types';
import { ModalBase } from '@dialogs/modal-base';
import { environment } from '@environments/environment';
import { servers } from '@lib/variables/static-variables';
import { NxApplyService } from '@services/apply.service';
import { NxProcessService } from '@services/process.service';
import { Process } from '@services/process.service/process';
import { NxToastService } from '@services/toast.service';
import { WINDOW } from '@services/window-provider';

@Component({
    selector: 'nx-modal-restart-server-content',
    templateUrl: 'restart-server.component.html',
    styleUrls: [],
})
export class RestartServerModalContent extends ModalBase<DT['return']> {
    LANG = staticLang;

    serverName: string;
    restartServer: Process;
    readonly maxNumberServerChecked: number = 6;

    constructor(
        private processService: NxProcessService,
        private dialogs: NxDialogsService,
        private ribbonService: NxRibbonService,
        private toastService: NxToastService,
        private applyService: NxApplyService,
        dialogRef: DialogRef<DT['return']>,
        @Inject(DIALOG_DATA) { system, server }: DT['data'],
        @Inject(WINDOW) private window: Window,
    ) {
        super(dialogRef);

        this.serverName = server.name;

        this.restartServer = this.processService.createProcess(
            () => {
                this.unlock();
                const haveOnlineServers = system.serverManager.servers.some(
                    ({ status, id }) => status === 'Online' && id !== server.id,
                );
                if (!haveOnlineServers) {
                    this.ribbonService.show(
                        this.LANG.ribbon.systemOffline,
                        [],
                        'alert',
                        undefined,
                        true,
                    );
                }
                this.applyService.isOnline$.next(haveOnlineServers);
                system.isAvailable = false;
                return system.serverManager.restartServer(server.id);
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
                system.currentBusyServerIds.add(server.id);
                this.close(servers.status.restarting);
                let systemOfflineShown = false;
                let serverHasGoneOfflineOnce = false;
                let serverOnlineChecked = 0;
                const serverSubscription = system.serverManager
                    .getForceServers(false)
                    .pipe(
                        map(res => {
                            if (res) {
                                const serverStatuses = Object.fromEntries(
                                    res.map(server => [server.id, server.status]),
                                );
                                if (!serverStatuses[server.id]) {
                                    throw Error('server not found');
                                }
                                if (serverStatuses[server.id] === 'Offline') {
                                    serverHasGoneOfflineOnce = true;
                                    throw Error('still restarting');
                                }
                                if (
                                    !serverHasGoneOfflineOnce ||
                                    serverOnlineChecked < this.maxNumberServerChecked
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
                            return system
                                .getInfo(true, false)
                                .then(() => {
                                    if (!system.isOnline) {
                                        this.ribbonService.show(
                                            this.LANG.ribbon.systemOffline,
                                            [],
                                            'alert',
                                            undefined,
                                            true,
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
                                    if (!systemOfflineShown && [502, 503].includes(val.status)) {
                                        systemOfflineShown = true;
                                        serverHasGoneOfflineOnce = true;
                                        this.ribbonService.show(
                                            this.LANG.ribbon.systemOffline,
                                            [],
                                            'alert',
                                            undefined,
                                            true,
                                        );
                                    }
                                }),
                                delayWhen(() => timer(4000)),
                            );
                        }),
                    )
                    .subscribe(() => {
                        system.isAvailable = true;
                        this.ribbonService.hide();
                        system.systemInfo = system;

                        serverSubscription.unsubscribe();
                    });
            },
            err => {
                this.unlock();
                system.currentBusyServerIds.delete(server.id);
                system.isAvailable = true;
                let message = this.LANG.servers.restartFailed;

                if (err && (err.name === 'TimeoutError' || err.status === 503)) {
                    message = this.LANG.servers.serverOffline;
                    this.close(servers.status.offline);
                    this.toastService.notify(message, ToastType.Warning);
                } else if (err.errorId === servers.errors.oldSessionErrorId) {
                    this.toastService.notify(this.LANG.servers.restartFailed, ToastType.Warning);
                } else if (err.status === 403 || err.errorId === servers.errors.unauthorized) {
                    return this.dialogs.expiredSession().then(() => this.window.location.reload());
                } else {
                    this.toastService.notify(message, ToastType.Warning);
                }
            },
        );
    }
}
