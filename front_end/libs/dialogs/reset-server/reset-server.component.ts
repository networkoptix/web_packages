import { DOCUMENT } from '@angular/common';
import { Component, Inject, Input } from '@angular/core';
import { Router } from '@angular/router';
import { LanguageI18NStaticTypes } from '@common/language/language_i18n_static_types';
import { LocalStorageService } from 'ngx-webstorage';
import { timer } from 'rxjs';
import { delayWhen, retryWhen, map } from 'rxjs/operators';

import { DIALOG_DATA, DialogRef } from '@dialogs/dialog-ref';
import { NxSimpleDialogsService } from '@dialogs/simple-dialogs.service';
import { NxToastService } from '@dialogs/toast.service';
import { environment } from '@environments/environment';
import { NxLoginService } from '@services/login.service';
import { NxAppStateService } from '@services/nx-app-state.service';
import type { IConfig } from '@services/nx-config/config-types';
import { NxConfigService } from '@services/nx-config/nx-config.service';
import { NxLanguageProviderService } from '@services/nx-language-provider';
import { NxProcessService } from '@services/process.service';
import { Process } from '@services/process.service/process';
import { ModuleInformation } from '@services/system-api.types';
import type { NxSystem } from '@services/system.service/system';
import { WINDOW } from '@services/window-provider';
import { cleanId, pickFrom } from '@utils/general';

@Component({
    selector: 'nx-modal-reset-server-content',
    templateUrl: 'reset-server.component.html',
    styleUrls: []
})
export class ResetServerModalContent {
    @Input() closable: boolean;

    LANG: LanguageI18NStaticTypes;
    CONFIG: IConfig;

    system: NxSystem;
    serverName: string;
    serverId: string;
    needsUpdate: boolean;
    resetServer: Process;
    password: string;
    hideErrors = true;

    constructor(
        configService: NxConfigService,
        languageService: NxLanguageProviderService,
        private appState: NxAppStateService,
        private loginService: NxLoginService,
        private processService: NxProcessService,
        private simpleDialogService: NxSimpleDialogsService,
        private toastService: NxToastService,
        private localStorage: LocalStorageService,
        private router: Router,
        public dialogRef: DialogRef,
        @Inject(DIALOG_DATA) private dialogData: any,
        @Inject(WINDOW) private window: Window,
        @Inject(DOCUMENT) private document: Document,
    ) {
        this.LANG = languageService.translations;
        this.CONFIG = configService.getConfig();
    }

    ngOnInit(): void {
        pickFrom(this.dialogData, ['system', 'serverName', 'serverId'], this);

        const handleResetFailError = (from: string, error): void => {
            console.error(`Error in reset-server dialog from ${from}:`, error);
            this.toastService.notify(
                this.LANG.servers.resetFailed(),
                this.CONFIG.toast.warning,
            );
        };

        const wrongPasswordHandler = (): false => {
            this.toastService.notify(
                this.LANG.servers.resetFailed(),
                this.CONFIG.toast.warning,
            );
            return false;
        };
        const isResettingCurrentServer = (): boolean => {
            const currentServer = this.system.serverManager.servers
                .find(server => server.id === this.serverId);
            return currentServer.networkAddresses.includes(this.document.location.host) ||
                this.system.info.name === currentServer.name;
        };
        const routeToNextServer = (): void => {
            const { servers } = this.system.serverManager;
            const currentServerIndex = servers.findIndex(server => server.id === this.serverId);
            const nextServerId = cleanId(currentServerIndex === servers.length - 1
                ? servers[0].id : servers[currentServerIndex + 1].id);
            this.router.navigate(['/settings', 'servers', nextServerId]);
        };

        this.resetServer = this.processService
            .createProcess(() => {
                return this.system.serverManager.restoreFactorySettings(
                    this.serverId,
                    this.password
                ).toPromise();
            }, {
                ignoreError: true,
                ignoreUnauthorized: true,
                successMessage: this.LANG.servers.beginReset?.(),
                errorCodes: {
                    invalidParameter: wrongPasswordHandler,
                    wrongPassword: wrongPasswordHandler
                }
            }, async () => {
                const numberOfServers = this.system.serverManager.servers?.length || 0;
                if (environment.isLocal && numberOfServers) {
                    this.close();
                    if (numberOfServers === 1) {
                        this.localStorage.store('resetServer', true);
                        setTimeout(() => this.window.location.reload(), 2000);
                    } else if (isResettingCurrentServer()) {
                        this.appState.systemAvailable$.next(false);
                    } else {
                        routeToNextServer();
                    }
                    return;
                }

                let moduleInfo: ModuleInformation;
                try {
                    moduleInfo = await this.system.serverManager.getModuleInfo(this.serverId).toPromise();
                } catch (err) {
                    if (![503, 504].includes(err.status)) {
                        return handleResetFailError('getModuleInfo', err);
                    } else if (environment.isLocal) {
                        // If we failed to get module info the system probably has only one server.
                        this.close();
                        this.appState.systemAvailable$.next(false);
                    }
                }
                const { runtimeId: initialRuntimeId } = moduleInfo.reply;
                return this.system.serverManager.restartServer(this.serverId)
                    .then(() => {
                        const serverSubscription = this.system.serverManager.getModuleInfo(this.serverId)
                            .pipe(
                                map(res => {
                                    if (res.reply.id !== this.serverId) {
                                        throw Error('server id should be the same');
                                    }
                                    if (res.reply.runtimeId === initialRuntimeId) {
                                        throw Error('runtime id should be different after restart');
                                    }
                                }),
                                retryWhen(errors =>
                                    errors.pipe(delayWhen(() =>
                                        timer(4000)
                                    ))
                                )
                            )
                            .subscribe(
                                () => {
                                    this.system.currentServerNotBusy = true;
                                    this.system.systemInfo = this.system;
                                    this.close();
                                    const successMessage = this.LANG.servers
                                        .resetSuccessful({
                                            serverName: this.serverName
                                        });
                                    this.toastService.notify(successMessage, this.CONFIG.toast.success);
                                    serverSubscription.unsubscribe();
                                },
                                err => {
                                    console.error('error in reset-server dialog', err);
                                    this.system.currentServerNotBusy = true;
                                    return handleResetFailError('getModule post restart', err);
                                }
                            );
                    })
                    .catch(err => handleResetFailError('restartServer', err));
            }, err => {
                if (err.errorId === this.CONFIG.servers.errors.oldSessionErrorId) {
                    this.needsUpdate = true;
                    this.loginService.currentSystem = this.system;
                    this.loginService.updateSession('reset')
                        .then(ready => {
                            this.needsUpdate = !ready;
                            if (ready) {
                                this.resetServer.run();
                            }
                        });
                } else if (err.status === 403 || err.errorId === this.CONFIG.servers.errors.unauthorized) {
                    return this.simpleDialogService.expiredSession().then(() => this.window.location.reload());
                }
            });
    }

    close = (msg?: string): void => {
        this.dialogRef.close(msg);
    };
}
