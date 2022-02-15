import { Component, Inject, Input } from '@angular/core';

import { LanguageI18NStaticTypes } from '@app/language_i18n_static_types';
import { DIALOG_DATA, DialogRef } from '@dialogs/dialog-ref';
import { NxSimpleDialogsService } from '@dialogs/simple-dialogs.service';
import { NxLoginService } from '@services/login.service';
import type { IConfig } from '@services/nx-config/config-types';
import { NxConfigService } from '@services/nx-config/nx-config.service';
import { NxLanguageProviderService } from '@services/nx-language-provider';
import { NxProcessService, Process } from '@services/process.service';
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
    CONFIG: IConfig;

    system: NxSystem;
    serverName: string;
    serverId: string;
    detachServer: Process;
    needsUpdate: boolean;
    password: string;

    constructor(
        language: NxLanguageProviderService,
        configService: NxConfigService,
        private loginService: NxLoginService,
        private processService: NxProcessService,
        private simpleDialogService: NxSimpleDialogsService,
        private toastService: NxToastService,
        public dialogRef: DialogRef,
        @Inject(DIALOG_DATA) private dialogData: any,
        @Inject(WINDOW) private window: Window,
    ) {
        this.CONFIG = configService.getConfig();
        this.LANG = language.translations;
    }

    ngOnInit() {
        pickFrom(this.dialogData, ['system', 'serverName', 'serverId'], this);

        const options = {
            classname: this.CONFIG.toast.warning,
            autohide: true,
            delay: this.CONFIG.alertTimeout
        };
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
                    options.classname = this.CONFIG.toast.success;
                    this.toastService.show(
                        this.LANG.servers.detachSystemSuccess(),
                        options
                    );
                    window.location.reload();
                    // may need to remove & update system eventually
                    // const anotherServerId = this.system.servers.find(server => server.id !== this.serverId).id;
                    // return this.system.serverManager.removeMediaserver(anotherServerId, this.serverId).toPromise();
                    // return this.system.update().subscribe()
                },
                err => {
                    if (
                        err.errorId ===
                        this.CONFIG.servers.errors.oldSessionErrorId
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
                    } else if (err.status === 403 || err.errorId === this.CONFIG.servers.errors.unauthorized) {
                        return this.simpleDialogService.expiredSession().then(res => this.window.location.reload(res));
                    }
                    this.system.currentServerNotBusy = true;
                    this.toastService.show(
                        this.LANG.servers.detachSystemFailed(),
                        options
                    );
                }
            );
    }

    close = (msg?: string) => {
        this.dialogRef.close(msg);
    }
}
