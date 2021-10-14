import { Component, Input, Injector } from '@angular/core';
import { NgbActiveModal }             from '@ng-bootstrap/ng-bootstrap';
import { timer }                      from 'rxjs';
import {
    delayWhen, retryWhen, map,
    tap, mergeMap
}                                     from 'rxjs/operators';

import { NxRibbonService }           from '@components/ribbon';
import { NxProcessService, Process } from '@services/process.service';
import { NxLanguageProviderService } from '@services/nx-language-provider';
import { NxConfigService, IConfig }  from '@services/nx-config';
import { NxToastService }            from '@dialogs/toast.service';
import { NxApplyService }            from '@services/apply.service';
import { LanguageI18NStaticTypes }   from '@app/language_i18n_static_types';

@Component({
    selector    : 'nx-modal-restart-server-content',
    templateUrl : 'restart-server.component.html',
    styleUrls   : []
})
export class RestartServerModalContent {
    @Input() system;
    @Input() serverName: string;
    @Input() serverId: string;
    @Input() closable: boolean;

    LANG: LanguageI18NStaticTypes;
    CONFIG: IConfig;
    restartServer: Process;
    private applyService: NxApplyService

    constructor(
        configService: NxConfigService,
        languageService: NxLanguageProviderService,
        public activeModal: NgbActiveModal,
        private processService: NxProcessService,
        private ribbonService: NxRibbonService,
        private toastService: NxToastService,
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
            classname : this.CONFIG.toast.warning,
            autohide  : true,
            delay     : this.CONFIG.alertTimeout
        };
        this.restartServer = this.processService
            .createProcess(() => {
                const haveOnlineServers = this.system.servers.filter(({ status, id }) => status === 'Online' && id !== this.serverId);
                if (!haveOnlineServers) {
                    this.ribbonService.show(this.LANG.ribbon.systemOffline?.(), [], 'alert', undefined, true);
                }
                this.applyService.isOnline$.next(haveOnlineServers);
                this.system.isAvailable = false;
                return this.system.restartServer(this.serverId);
            },
            { ignoreError: true },
            () => {
                this.system.currentBusyServerIds.add(this.serverId);
                this.close(this.CONFIG.servers.status.restarting);
                let systemOfflineShown = false;
                let serverHasGoneOfflineOnce = false;
                const serverSubscription = this.system.serverManager.getForceServers(false)
                    .pipe(
                        map((res: any) => {
                            if (res) {
                                // maps server status into serverObj
                                const serverObj: { id?: string } = {};
                                Object.entries(res).forEach((server: [string, { id: string, status: string}]) => {
                                    serverObj[server[1].id] = server[1].status;
                                });
                                if (!serverObj[this.serverId]) {
                                    throw Error('server not found');
                                }
                                if (serverObj[this.serverId] === 'Offline') {
                                    serverHasGoneOfflineOnce = true;
                                    throw Error('still restarting');
                                }
                                if (!serverHasGoneOfflineOnce) {
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
                                        this.ribbonService.show(this.LANG.ribbon.systemOffline?.(), [], 'alert', undefined, true);
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
                                    if (!systemOfflineShown && [502, 503].includes(val.status)) {
                                        systemOfflineShown = true;
                                        serverHasGoneOfflineOnce = true;
                                        this.ribbonService.show(this.LANG.ribbon.systemOffline?.(), [], 'alert', undefined, true);
                                    }
                                }),
                                delayWhen(() => timer(4000))
                            );
                        })
                    )
                    .subscribe(() => {
                        this.ribbonService.hide();
                        if (this.system.currentBusyServerIds.has(this.serverId)) {
                            this.system.currentServerNotBusy = true;
                            this.system.currentBusyServerIds.delete(this.serverId);
                            this.system.isAvailable = true;
                        }
                        this.system.systemInfo = this.system;
                        options.classname = this.CONFIG.toast.success;
                        this.toastService.show(this.LANG.servers.restartSuccessful?.(), options);
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
                }
                this.toastService.show(message, options);
            });
    }

    close(msg) {
        this.activeModal.close(msg);
    }
}
