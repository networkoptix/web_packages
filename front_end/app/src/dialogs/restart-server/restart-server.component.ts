import { Component, Input, Injector, Inject } from '@angular/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { timer } from 'rxjs';
import {
    delayWhen,
    retryWhen,
    map,
    tap,
    mergeMap
} from 'rxjs/operators';

import { LanguageI18NStaticTypes } from '@app/language_i18n_static_types';
import { NxRibbonService } from '@components/ribbon';
import { NxSimpleDialogsService } from '@dialogs/simple-dialogs.service';
import { NxToastService } from '@dialogs/toast.service';
import { NxApplyService } from '@services/apply.service';
import { NxLoginService } from '@services/login.service';
import { NxConfigService, IConfig } from '@services/nx-config';
import { NxLanguageProviderService } from '@services/nx-language-provider';
import { NxProcessService, Process } from '@services/process.service';
import { NxSystem } from '@services/system.service';
import { WINDOW } from '@services/window-provider';

@Component({
    selector: 'nx-modal-restart-server-content',
    templateUrl: 'restart-server.component.html',
    styleUrls: []
})
export class RestartServerModalContent {
    @Input() system: NxSystem;
    @Input() serverName: string;
    @Input() serverId: string;
    @Input() closable: boolean;

    LANG: LanguageI18NStaticTypes;
    CONFIG: IConfig;
    needsUpdate: boolean;
    restartServer: Process;
    private applyService: NxApplyService

    constructor(
        configService: NxConfigService,
        languageService: NxLanguageProviderService,
        public activeModal: NgbActiveModal,
        private loginService: NxLoginService,
        private processService: NxProcessService,
        private simpleDialogService: NxSimpleDialogsService,
        private ribbonService: NxRibbonService,
        private toastService: NxToastService,
        @Inject(WINDOW) private window: Window,
        injector: Injector
    ) {
        this.CONFIG = configService.getConfig();
        this.LANG = languageService.translations;
        setTimeout(() => {
            this.applyService = injector.get(NxApplyService);
        }, 0);
    }

    ngOnInit() {
        const options      = {
            classname: this.CONFIG.toast.warning,
            autohide: true,
            delay: this.CONFIG.alertTimeout
        };
        this.restartServer = this.processService
            .createProcess(() => {
                const haveOnlineServers = this.system.servers
                    .some(({ status, id }) =>
                        status === 'Online' && id !== this.serverId
                    );
                if (!haveOnlineServers) {
                    this.ribbonService.show(
                        this.LANG.ribbon.systemOffline?.(),
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
                this.close(this.CONFIG.servers.status.restarting);
                let systemOfflineShown = false;
                let serverHasGoneOfflineOnce = false;
                let serverOnlineChecked = 0;
                const serverSubscription = this.system.serverManager.getForceServers(false)
                    .pipe(
                        map((res: any) => {
                            if (res) {
                                // maps server status into serverObj
                                const serverObj: { id?: string } = {};
                                Object.entries(res).forEach((server: [
                                    string,
                                    { id: string, status: string}
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
                                    serverOnlineChecked < this.CONFIG.maxNumberServerChecked
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
                            if (NxConfigService.isLocal) {
                                // give the user chance to read the toaster
                                setTimeout(() => window.location.reload(), 2000);
                                throw Error('re-login on restart');
                            }
                            // makes sure that system is online
                            return this.system.getInfo(true, false)
                                .then(() => {
                                    if (!this.system.isOnline) {
                                        this.ribbonService.show(
                                            this.LANG.ribbon.systemOffline?.(),
                                            [],
                                            'alert',
                                            undefined,
                                            true
                                        );
                                        throw Error('system is offline still');
                                    }
                                })
                                .catch(err => { throw Error(err); });
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
                                            this.LANG.ribbon.systemOffline?.(),
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
                        options.classname = this.CONFIG.toast.success;
                        this.toastService.show(
                            this.LANG.servers.restartSuccessful?.(),
                            options
                        );
                        serverSubscription.unsubscribe();
                    });
            },
            err => {
                this.system.currentServerNotBusy = true;
                this.system.currentBusyServerIds.delete(this.serverId);
                this.system.isAvailable = true;
                let message = this.LANG.servers.restartFailed();

                if (err && (err.name === 'TimeoutError' || err.status === 503)) {
                    message = this.LANG.servers.serverOffline?.();
                    this.close(this.CONFIG.servers.status.offline);
                    this.toastService.show(message, options);
                } else if (err.errorId === this.CONFIG.servers.errors.oldSessionErrorId) {
                    this.needsUpdate = true;
                    this.loginService.currentSystem = this.system;
                    this.loginService.updateSession('restart')
                        .then((ready) => {
                            this.needsUpdate = !ready;
                            if (ready) {
                                this.restartServer.run();
                            }
                        });
                } else if (err.status === 403 || err.errorId === this.CONFIG.servers.errors.unauthorized) {
                    return this.simpleDialogService.expiredSession().then(() => this.window.location.reload());
                } else {
                    this.toastService.show(message, options);
                }
            });
    }

    close(msg) {
        this.activeModal.close(msg);
    }
}
