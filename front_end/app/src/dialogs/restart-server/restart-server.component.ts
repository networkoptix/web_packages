import { Component, Input, Renderer2 } from '@angular/core';
import { NgbActiveModal }              from '@ng-bootstrap/ng-bootstrap';
import { NxLanguageProviderService }   from '../../services/nx-language-provider';
import { NxProcessService }            from '../../services/process.service';
import { NxToastService }              from '../../dialogs/toast.service';
import { NxConfigService }             from '../../services/nx-config';
import { NxSystemAPIService }          from '../../services/system-api.service';

@Component({
    selector: 'nx-modal-restart-server-content',
    templateUrl: 'restart-server.component.html',
    styleUrls: []
})
export class RestartServerModalContent {
    @Input() system: any;
    @Input() serverId;
    @Input() closable;

    LANG: any;
    CONFIG: any;
    restartServer: any;

    constructor(private activeModal: NgbActiveModal,
                private renderer: Renderer2,
                private language: NxLanguageProviderService,
                private processService: NxProcessService,
                private toastService: NxToastService,
                private configService: NxConfigService,
                private systemAPIService: NxSystemAPIService,
    ) {
        this.CONFIG = this.configService.getConfig();
        this.LANG = this.language.getTranslations();
    }

    ngOnInit() {
        let oldUptime = Number.MAX_VALUE;

        const pingServer = () => {
            this.system.getServerStats(this.serverId)
                .then(res => {
                    console.log('one more ping with result', res);
                    if (res.reply) console.log('uptimeMs/oldUptime', res.reply.uptimeMs, oldUptime);
                    if (res.reply && Number(res.reply.uptimeMs) < oldUptime) {
                        console.log('uptimeMs < oldUptime');
                        this.system.update();
                        const options = {
                            classname: 'success',
                            autohide: true,
                            delay: this.CONFIG.alertTimeout
                        };
                        this.toastService.show(this.LANG.servers.restartSuccessful, options);
                        return;
                    }
                    setTimeout(pingServer, 3000);
                });
        };

        this.restartServer = this.processService
            .createProcess(() => {
                console.log('getServerStats CALLED!');
                return this.system.getServerStats(this.serverId)
                    .then(res => {
                        console.log('res in restart process', res);
                        oldUptime = Number(res.reply.uptimeMs);
                        this.system.restartServer(this.serverId)
                            .then(() => {
                                this.activeModal.close('restarting');
                                pingServer();
                            });
                    });
            }, { successMessage: this.LANG.servers.beginRestart });
    }

    close() {
        this.activeModal.close();
    }
}