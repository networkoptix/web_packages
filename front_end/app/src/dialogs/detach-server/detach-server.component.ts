import { Component, Input }          from '@angular/core';
import { NgbActiveModal }            from '@ng-bootstrap/ng-bootstrap';
import { NxLanguageProviderService } from '../../services/nx-language-provider';
import { NxProcessService }          from '../../services/process.service';
import { NxToastService }            from '../toast.service';
import { NxConfigService, IConfig }  from '../../services';
import { LanguageI18NStaticTypes }   from '../../../language_i18n_static_types';

@Component({
    selector    : 'nx-modal-detach-server-content',
    templateUrl : 'detach-server.component.html',
    styleUrls   : []
})
export class DetachServerModalContent {
    @Input() system: any;
    @Input() serverName: string;
    @Input() serverId;
    @Input() closable;

    LANG: LanguageI18NStaticTypes;
    CONFIG: IConfig;
    detachServer: any;
    password: string;

    constructor(
        language: NxLanguageProviderService,
        configService: NxConfigService,
        public activeModal: NgbActiveModal,
        private processService: NxProcessService,
        private toastService: NxToastService
    ) {
        this.CONFIG = configService.getConfig();
        this.LANG = language.getTranslations();
    }

    ngOnInit() {
        this.detachServer = this.processService
            .createProcess(() => {
                const options = {
                    classname : this.CONFIG.toast.warning,
                    autohide  : true,
                    delay     : this.CONFIG.alertTimeout
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
