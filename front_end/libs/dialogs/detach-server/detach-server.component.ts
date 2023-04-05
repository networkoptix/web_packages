import { Component, Inject, Input } from '@angular/core';

import staticLang from '@common/language/language_i18n_static.json';
import { DIALOG_DATA, DialogRef } from '@dialogs/dialog-ref';
import { NxDialogsService } from '@dialogs/dialogs.service';
import { SessionState } from '@dialogs/update-session/update-session.component.types';
import { servers, toast } from '@lib/variables/static-variables';
import { NxProcessService } from '@services/process.service';
import { Process } from '@services/process.service/process';
import type { NxSystem } from '@services/system.service/system';
import { WINDOW } from '@services/window-provider';
import { pickFrom } from '@utils/general';

import { NxToastService } from '../toast.service';

@Component({
    selector: 'nx-modal-detach-server-content',
    templateUrl: 'detach-server.component.html',
    styleUrls: [],
})
export class DetachServerModalContent {
    @Input() closable = true;

    LANG = staticLang;

    system: NxSystem;
    serverName: string;
    serverId: string;
    detachServer: Process;
    password: string;

    constructor(
        private processService: NxProcessService,
        private dialogs: NxDialogsService,
        private toastService: NxToastService,
        public dialogRef: DialogRef,
        @Inject(DIALOG_DATA) private dialogData: any,
        @Inject(WINDOW) private window: Window,
    ) {}

    ngOnInit(): void {
        pickFrom(this.dialogData, ['system', 'serverName', 'serverId'], this);

        this.detachServer = this.processService
            .createProcess(
                () => this.system.serverManager.detachFromSystem(
                    this.serverId,
                    this.password
                ).toPromise(),
                { ignoreError: true },
                () => {
                    this.close('success');
                    this.toastService.notify(
                        this.LANG.servers.detachSystemSuccess,
                        toast.success,
                    );
                    this.window.location.reload();
                    // may need to remove & update system eventually
                    // const anotherServerId = this.system.servers.find(server => server.id !== this.serverId).id;
                    // return this.system.serverManager.removeMediaserver(anotherServerId, this.serverId).toPromise();
                    // return this.system.update().subscribe()
                },
                err => {
                    if (err.errorId === servers.errors.oldSessionErrorId) {
                        this.dialogs.updateSession({
                            sessionState: SessionState.Detach,
                            system: this.system,
                            noConnectionMsg: this.LANG.dialogs.updateSession.detachServer,
                            openingRef: this.dialogRef,
                            processAction: 'danger',
                        }).then(ready => {
                            if (ready) {
                                this.detachServer.run();
                            }
                        });
                    } else if (err.status === 403 || err.errorId === servers.errors.unauthorized) {
                        return this.dialogs.expiredSession().then(() => this.window.location.reload());
                    } else {
                        this.close();
                        this.toastService.notify(
                            this.LANG.servers.detachSystemFailed,
                            toast.warning,
                        );
                    }
                }
            );
    }

    close = (msg?: string): void => {
        this.dialogRef.close(msg);
    };
}
