import { Component, Inject, Input } from '@angular/core';

import { LanguageI18NStaticTypes } from '@common/language/language_i18n_static_types';
import { DIALOG_DATA, DialogRef } from '@dialogs/dialog-ref';
import { NxSimpleDialogsService } from '@dialogs/simple-dialogs.service';
import { servers, toast } from '@lib/variables/static-variables';
import { NxLoginService } from '@services/login.service';
import { NxLanguageProviderService } from '@services/nx-language-provider';
import { NxProcessService } from '@services/process.service';
import { Process } from '@services/process.service/process';
import type { NxSystem } from '@services/system.service/system';
import { WINDOW } from '@services/window-provider';
import { pickFrom } from '@utils/general';

import { NxToastService } from '../toast.service';

@Component({
    selector: 'nx-modal-detach-server-content',
    templateUrl: 'detach-server.component.html',
    styleUrls: []
})
export class DetachServerModalContent {
    @Input() closable = true;

    LANG: LanguageI18NStaticTypes;

    system: NxSystem;
    serverName: string;
    serverId: string;
    detachServer: Process;
    needsUpdate: boolean;
    password: string;

    constructor(
        language: NxLanguageProviderService,
        private loginService: NxLoginService,
        private processService: NxProcessService,
        private simpleDialogService: NxSimpleDialogsService,
        private toastService: NxToastService,
        public dialogRef: DialogRef,
        @Inject(DIALOG_DATA) private dialogData: any,
        @Inject(WINDOW) private window: Window,
    ) {
        this.LANG = language.translations;
    }

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
                    this.system.currentServerNotBusy = true;
                    this.close('success');
                    this.toastService.notify(
                        this.LANG.servers.detachSystemSuccess(),
                        toast.success,
                    );
                    this.window.location.reload();
                    // may need to remove & update system eventually
                    // const anotherServerId = this.system.servers.find(server => server.id !== this.serverId).id;
                    // return this.system.serverManager.removeMediaserver(anotherServerId, this.serverId).toPromise();
                    // return this.system.update().subscribe()
                },
                err => {
                    if (
                        err.errorId ===
                        servers.errors.oldSessionErrorId
                    ) {
                        this.needsUpdate = true;
                        this.loginService.currentSystem = this.system;
                        this.loginService.updateSession('detach')
                            .then(ready => {
                                this.needsUpdate = !ready;
                                if (ready) {
                                    this.detachServer.run();
                                }
                            });
                    } else if (err.status === 403 || err.errorId === servers.errors.unauthorized) {
                        return this.simpleDialogService.expiredSession().then(() => this.window.location.reload());
                    } else {
                        this.close();
                        this.system.currentServerNotBusy = true;
                        this.toastService.notify(
                            this.LANG.servers.detachSystemFailed(),
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
