import { Component, Inject, Input } from '@angular/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';

import { LanguageI18NStaticTypes } from '@app/language_i18n_static_types';
import { NxSimpleDialogsService } from '@dialogs/simple-dialogs.service';
import { NxLoginService } from '@services/login.service';
import { NxConfigService, IConfig } from '@services/nx-config';
import { NxLanguageProviderService } from '@services/nx-language-provider';
import { NxProcessService, Process } from '@services/process.service';
import { NxSystem } from '@services/system.service';
import { WINDOW } from '@services/window-provider';

import { NxToastService } from '../toast.service';

@Component({
    selector: 'nx-modal-detach-server-content',
    templateUrl: 'detach-server.component.html',
    styleUrls: []
})
export class DetachServerModalContent {
    @Input() system: NxSystem;
    @Input() serverName: string;
    @Input() serverId;
    @Input() closable;

    LANG: LanguageI18NStaticTypes;
    CONFIG: IConfig;
    detachServer: Process;
    needsUpdate: boolean;
    password: string;

    constructor(
        language: NxLanguageProviderService,
        configService: NxConfigService,
        public activeModal: NgbActiveModal,
        private loginService: NxLoginService,
        private processService: NxProcessService,
        private simpleDialogService: NxSimpleDialogsService,
        private toastService: NxToastService,
        @Inject(WINDOW) private window: Window,
    ) {
        this.CONFIG = configService.getConfig();
        this.LANG = language.translations;
    }

    ngOnInit() {
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
                    this.activeModal.close('success');
                    options.classname = this.CONFIG.toast.success;
                    this.toastService.show(
                        this.LANG.servers.detachSystemSuccess(),
                        options
                    );
                    window.location.reload();
                    // may need to remove & update system eventually
                    // const anotherServerId = this.system.servers.find(server => server.id !== this.serverId).id;
                    // return this.system.removeMediaserver(anotherServerId, this.serverId).toPromise();
                    // return this.system.update().subscribe()
                },
                (err) => {
                    if (
                        err.errorId ===
                        this.CONFIG.servers.errors.oldSessionErrorId
                    ) {
                        this.needsUpdate = true;
                        this.loginService.currentSystem = this.system;
                        this.loginService.updateSession('detach')
                            .then((ready) => {
                                this.needsUpdate = !ready;
                                if (ready) {
                                    this.detachServer.run();
                                }
                            });
                    } else if (err.status === 403 || err.errorId === this.CONFIG.servers.errors.unauthorized) {
                        return this.simpleDialogService.expiredSession().then(() => this.window.location.reload());
                    }
                    this.system.currentServerNotBusy = true;
                    this.toastService.show(
                        this.LANG.servers.detachSystemFailed(),
                        options
                    );
                }
            );
    }

    close() {
        this.activeModal.close();
    }
}
