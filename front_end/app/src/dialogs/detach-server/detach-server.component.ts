import { Component, Input }            from '@angular/core';
import { NgbActiveModal }              from '@ng-bootstrap/ng-bootstrap';
import { NxLanguageProviderService }   from '../../services/nx-language-provider';
import { NxProcessService }            from '../../services/process.service';
import { NxToastService }              from '../../dialogs/toast.service';
import { NxConfigService }             from '../../services/nx-config/nx-config.service';
import { IConfig } from '../../services/nx-config/config-types';

@Component({
    selector: 'nx-modal-detach-server-content',
    templateUrl: 'detach-server.component.html',
    styleUrls: []
})
export class DetachServerModalContent {
    @Input() system: any;
    @Input() serverName: string;
    @Input() serverId;
    @Input() closable;

    LANG: any;
    CONFIG: IConfig;
    detachServer: any;
    password: string;

    constructor(private activeModal: NgbActiveModal,
                private language: NxLanguageProviderService,
                private processService: NxProcessService,
                private toastService: NxToastService,
                private configService: NxConfigService,
    ) {
        this.CONFIG = this.configService.getConfig();
        this.LANG = this.language.getTranslations();
    }

    ngOnInit() {
        this.detachServer = this.processService
            .createProcess(() => {
                const options = {
                    classname: this.CONFIG.toast.warning,
                    autohide: true,
                    delay: this.CONFIG.alertTimeout
                };
                return this.system.detachFromSystem(this.serverId, this.password).toPromise()
                    .then(res => {
                        if (Number(res.error)) {
                            this.toastService.show(this.LANG.servers.detachSystemFailed, options);
                            return res;
                        }
                        return this.system.removeMediaserver(this.serverId).toPromise();
                    })
                    .then(() => this.system.update()
                        .subscribe(() => {
                            this.system.currentServerNotBusy = true;
                            this.activeModal.close('success');
                            options.classname = this.CONFIG.toast.success;
                            this.toastService.show(this.LANG.servers.detachSystemSuccess, options);
                        })
                    )
                    .catch(() => {
                        this.system.currentServerNotBusy = true;
                        this.toastService.show(this.LANG.servers.detachSystemFailed, options);
                    });
            });
    }

    close() {
        this.activeModal.close();
    }
}