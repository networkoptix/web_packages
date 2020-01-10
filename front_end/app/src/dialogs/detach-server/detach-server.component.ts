import { Component, Input }            from '@angular/core';
import { NgbActiveModal }              from '@ng-bootstrap/ng-bootstrap';
import { NxLanguageProviderService }   from '../../services/nx-language-provider';
import { NxProcessService }            from '../../services/process.service';
import { NxToastService }              from '../../dialogs/toast.service';
import { NxConfigService }             from '../../services/nx-config';

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
    CONFIG: any;
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
                    classname: 'success',
                    autohide: true,
                    delay: this.CONFIG.alertTimeout
                };
                return this.system.detachFromSystem(this.serverId, this.password).toPromise()
                    .then(res => {
                        if (res.error) {
                            options.classname = 'warning';
                            this.toastService.show(this.LANG.servers.detachSystemFailed, options);
                            return res;
                        }
                        this.activeModal.close();
                        this.system.currentServerNotBusy = true;
                        // may need to also delete the server using /ec2/removeMediaserver
                        // need to update system subscribe, so that it looks for servers and finds that this server is no longer there
                        this.toastService.show(this.LANG.servers.detachSystemSuccess, options);
                    })
                    .catch(() => {
                        this.system.currentServerNotBusy = true;
                        options.classname = 'warning';
                        this.toastService.show(this.LANG.servers.detachSystemFailed, options);
                    });
            }
                // , { successMessage: this.LANG.servers.beginDetach } process.service needs to be refactored to handle errors
            );
    }

    close() {
        this.activeModal.close();
    }
}