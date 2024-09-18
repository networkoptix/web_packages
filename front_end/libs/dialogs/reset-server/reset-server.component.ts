import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { CommonModule, DOCUMENT } from '@angular/common';
import { AfterViewInit, Component, ElementRef, Inject, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { LocalStorageService } from 'ngx-webstorage';
import { firstValueFrom, timer } from 'rxjs';
import { delayWhen, map, retryWhen } from 'rxjs/operators';

import { NxProcessButtonComponent } from '@components/process-button/process-button.component';
import { NxProcessCancelButtonComponent } from '@components/process-cancel-Button/process-cancel-button.component';
import { ToastType } from '@components/toast-container/toast.types';
import { NxDialogsService } from '@dialogs/dialogs.service';
import type { ResetServer as DT } from '@dialogs/dialogs.types';
import { ModalBase } from '@dialogs/modal-base';
import { environment } from '@environments/environment';
import staticLang from '@language_static';
import { PipesModule } from '@pipes/pipes.module';
import { NxAppStateService } from '@services/nx-app-state.service';
import { NxProcessService } from '@services/process.service';
import { Process } from '@services/process.service/process';
import { ModuleInformation } from '@services/system-api.types';
import type { NxSystem } from '@services/system.service/system';
import { NxToastService } from '@services/toast.service';
import { WINDOW } from '@services/window-provider';
import { servers } from '@static-variables';
import { cleanIdLegacy } from '@utils/general';

@Component({
    selector: 'nx-modal-reset-server-content',
    templateUrl: 'reset-server.component.html',
    styleUrls: [],
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        TranslateModule,

        PipesModule,
        NxProcessButtonComponent,
        NxProcessCancelButtonComponent,
    ],
})
export class ResetServerModalContent extends ModalBase<DT['return']> implements AfterViewInit {
    @ViewChild('passwordInput') private passwordInput: ElementRef<HTMLInputElement>;

    LANG = staticLang;

    system: NxSystem;
    serverName: string;
    resetServer: Process;
    password: string;
    hideErrors = true;

    constructor(
        private appState: NxAppStateService,
        private processService: NxProcessService,
        private dialogs: NxDialogsService,
        private toastService: NxToastService,
        private localStorage: LocalStorageService,
        private router: Router,
        dialogRef: DialogRef<DT['return']>,
        @Inject(DIALOG_DATA) { system, server }: DT['data'],
        @Inject(WINDOW) private window: Window,
        @Inject(DOCUMENT) private document: Document,
    ) {
        super(dialogRef);
        this.system = system;
        this.serverName = server.name;

        const handleResetFailError = (from: string, error: unknown): void => {
            this.unlock();
            console.error(`Error in reset-server dialog from ${from}:`, error);
            this.toastService.notify(this.LANG.servers.resetFailed, ToastType.Warning);
        };

        const wrongPasswordHandler = (): false => {
            this.toastService.notify(this.LANG.servers.resetFailed, ToastType.Warning);
            return false;
        };
        const isResettingCurrentServer = (): boolean => {
            const currentServer = this.system.serverManager.servers.find(s => s.id === server.id);
            return (
                currentServer.endpoints.some(e => e.includes(this.document.location.host)) ||
                this.system.info.name === currentServer.name
            );
        };
        const routeToNextServer = (): void => {
            const { servers } = this.system.serverManager;
            const currentServerIndex = servers.findIndex(s => s.id === server.id);
            const nextServerId = cleanIdLegacy(
                currentServerIndex === servers.length - 1
                    ? servers[0].id
                    : servers[currentServerIndex + 1].id,
            );
            this.router.navigate(['/settings', 'servers', nextServerId]);
        };

        this.resetServer = this.processService.createProcess(
            () => {
                this.lock();
                return firstValueFrom(
                    this.system.serverManager.restoreFactorySettings(server.id, this.password),
                );
            },
            {
                ignoreError: true,
                ignoreUnauthorized: true,
                successMessage: this.LANG.servers.beginReset,
                errorCodes: {
                    invalidParameter: wrongPasswordHandler,
                    wrongPassword: wrongPasswordHandler,
                },
            },
            async () => {
                const numberOfServers = this.system.serverManager.servers?.length || 0;
                if (environment.isLocal && numberOfServers) {
                    this.close(true);
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
                    moduleInfo = await firstValueFrom(
                        this.system.serverManager.getModuleInfo(server.id),
                    );
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
                return this.system.serverManager
                    .restartServer(server.id)
                    .then(() => {
                        const serverSubscription = this.system.serverManager
                            .getModuleInfo(server.id)
                            .pipe(
                                map(res => {
                                    if (res.reply.id !== server.id) {
                                        throw Error('server id should be the same');
                                    }
                                    if (res.reply.runtimeId === initialRuntimeId) {
                                        throw Error('runtime id should be different after restart');
                                    }
                                }),
                                retryWhen(errors => errors.pipe(delayWhen(() => timer(4000)))),
                            )
                            .subscribe(
                                () => {
                                    this.system.systemInfo = this.system;
                                    this.close();
                                    const successMessage = {
                                        value: this.LANG.servers.resetSuccessful,
                                        params: {
                                            serverName: this.serverName,
                                        },
                                    };
                                    this.toastService.notify(successMessage, ToastType.Success);
                                    serverSubscription.unsubscribe();
                                },
                                err => {
                                    console.error('error in reset-server dialog', err);
                                    return handleResetFailError('getModule post restart', err);
                                },
                            );
                    })
                    .catch(err => handleResetFailError('restartServer', err));
            },
            err => {
                this.unlock();
                if (err.errorId === servers.errors.oldSessionErrorId) {
                    this.toastService.notify(
                        this.LANG.dialogs.updateSession.resetServer,
                        ToastType.Warning,
                    );
                } else if (err.status === 403 || err.errorId === servers.errors.unauthorized) {
                    return this.dialogs.expiredSession().then(() => this.window.location.reload());
                }
            },
        );
    }

    ngAfterViewInit(): void {
        setTimeout(() => {
            this.passwordInput?.nativeElement.focus();
        });
    }
}
