import { DialogRef, DIALOG_DATA } from '@angular/cdk/dialog';
import { Component, Inject } from '@angular/core';
import { of, Subject, takeUntil } from 'rxjs';

import staticLang from '@common/language/language_i18n_static.json';
import { NxDialogsService } from '@dialogs/dialogs.service';
import { ModalBase } from '@dialogs/modal-base';
import { NxToastService } from '@dialogs/toast.service';
import { SessionState } from '@dialogs/update-session/update-session.component.types';
import { environment } from '@environments/environment';
import type { IEnvironment } from '@environments/environment-config';
import { servers, toast } from '@lib/variables/static-variables';
import { NxAccountService } from '@services/account.service';
import { NxProcessService } from '@services/process.service';
import { Process } from '@services/process.service/process';
import { NxSystemAPIService } from '@services/system-api.service';
import type { NxSystemRestAPI } from '@services/system-rest-api.service';
import { NxSystemsService } from '@services/systems.service';
import { WINDOW } from '@services/window-provider';

import type { Disconnect as DT } from '../dialogs.types';

@Component({
    selector: 'nx-modal-disconnect-content',
    templateUrl: 'disconnect.component.html',
    styleUrls: [],
})
export class DisconnectModalContent extends ModalBase<DT['return']> {
    readonly environment: IEnvironment = environment;
    LANG = staticLang;
    disconnect: Process;
    unsub$ = new Subject<boolean>();

    constructor(
        private processService: NxProcessService,
        private dialogs: NxDialogsService,
        private systemApiService: NxSystemAPIService,
        private toastService: NxToastService,
        private systemsService: NxSystemsService,
        private account: NxAccountService,
        public dialogRef: DialogRef<DT['return']>,
        @Inject(DIALOG_DATA) public system: DT['data'],
        @Inject(WINDOW) private window: Window,
    ) {
        super(dialogRef);
    }

    ngOnInit(): void {
        this.disconnect = this.processService.createProcess(() => {
            this.lock();

            if (this.environment.isLocal) {
                return this.disconnectLocal();
            }
            return new Promise<void>((resolve, reject) => {
                this.account.disconnect(this.system.id).then(() => {
                    this.systemsService.systemsSubject
                        .pipe(
                            takeUntil(this.unsub$)
                        )
                        .subscribe(systems => {
                            if (!systems.find(sys => sys.id === this.system.id)) {
                                this.unsub$.next(true);
                                resolve();
                            }
                        });
                    this.systemsService.userDisconnectSystem = true;
                    this.systemsService.forceUpdateSystemsAsPromise().then(() => {});
                }).catch(e => reject(e));
            });
        }, {
            ignoreError: true,
            ignoreUnauthorized: true
        }, res => {
            this.close(true);
            this.toastService.notify(
                this.LANG.toastMessage.system.disconnected.success,
                toast.success,
            );
        }, err => {
            if (err?.resultCode === 'userPasswordRequired' || err.errorId === servers.errors.oldSessionErrorId) {
                this.dialogs.updateSession({
                    sessionState: SessionState.Disconnect,
                    system: this.system,
                    noConnectionMsg: this.LANG.dialogs.updateSession.disconnect,
                    openingRef: this.dialogRef,
                    processAction: 'danger',
                }).then(ready => {
                    if (ready) {
                        this.disconnect.run();
                    } else {
                        this.unlock();
                    }
                });
            } else if (err.status === 403 || err.errorId === servers.errors.unauthorized) {
                this.unlock();
                return this.dialogs.expiredSession().then(() => this.window.location.reload());
            } else {
                this.unlock();
            }
        });
    }

    override close = (msg?: DT['return']): void => {
        this.dialogRef.close(msg);
    };

    private disconnectLocal(): Promise<void> {
        return this.systemApiService
            .createConnection<NxSystemRestAPI>(
                undefined,
                undefined,
                undefined,
                () => of('')
            )
            .disconnectFromCloud();
    }
}
