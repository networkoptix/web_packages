import { Component, Input }          from '@angular/core';
import { NgbActiveModal }            from '@ng-bootstrap/ng-bootstrap';

import { NxProcessService, Process } from '@services/process.service';
import { NxToastService }            from '../toast.service';
import { NxLanguageProviderService } from '@services/nx-language-provider';
import { NxConfigService, IConfig }  from '@services/nx-config';
import { LanguageI18NStaticTypes }   from '@app/language_i18n_static_types';
import { NxSystem }                  from '@services/system.service';
import { NxLoginService } from '@services/login.service';

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
        private toastService: NxToastService
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
                () => this.system.serverManager.detachFromSystem(this.serverId, this.password).toPromise(),
                { ignoreError: true },
                () => {
                    this.system.currentServerNotBusy = true;
                    this.activeModal.close('success');
                    options.classname = this.CONFIG.toast.success;
                    this.toastService.show(this.LANG.servers.detachSystemSuccess(), options);
                    window.location.reload();
                    // may need to remove & update system eventually
                    // const anotherServerId = this.system.servers.find(server => server.id !== this.serverId).id;
                    // return this.system.removeMediaserver(anotherServerId, this.serverId).toPromise();
                    // return this.system.update().subscribe()
                },
                (err) => {
                    if (err.errorId === 'sessionExpired') {
                        this.loginService.currentSystem = this.system;
                        this.loginService.updateSession()
                            .then((ready) => {
                                this.needsUpdate = !ready;
                                if (ready) {
                                    this.detachServer.run();
                                }
                            });
                    }
                    this.system.currentServerNotBusy = true;
                    this.toastService.show(this.LANG.servers.detachSystemFailed(), options);
                }
            );
    }

    close() {
        this.activeModal.close();
    }
}
