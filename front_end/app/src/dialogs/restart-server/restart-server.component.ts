import { Component, Input }          from '@angular/core';
import { NgbActiveModal }            from '@ng-bootstrap/ng-bootstrap';
import { NxLanguageProviderService } from '../../services/nx-language-provider';
import { NxProcessService }          from '../../services/process.service';
import { NxToastService }            from '../toast.service';
import { NxConfigService, IConfig }  from '../../services/nx-config';
import { timer }                     from 'rxjs';
import { delayWhen, retryWhen, map } from 'rxjs/operators';
import { LanguageI18NStaticTypes }   from '../../../language_i18n_static_types';

@Component({
    selector    : 'nx-modal-restart-server-content',
    templateUrl : 'restart-server.component.html',
    styleUrls   : []
})
export class RestartServerModalContent {
    @Input() system: any;
    @Input() serverName: string;
    @Input() serverId;
    @Input() closable;

    LANG: LanguageI18NStaticTypes;
    CONFIG: IConfig;
    restartServer: any;

    constructor(
        configService: NxConfigService,
        languageService: NxLanguageProviderService,
        private activeModal: NgbActiveModal,
        private processService: NxProcessService,
        private toastService: NxToastService
    ) {
        this.CONFIG = configService.getConfig();
        this.LANG = languageService.getTranslations();
    }

    ngOnInit() {
        let initialRuntimeId;
        const options      = {
            classname : this.CONFIG.toast.warning,
            autohide  : true,
            delay     : this.CONFIG.alertTimeout
        };
        this.restartServer = this.processService
            .createProcess(() => {
                return this.system.getModuleInfo(this.serverId).toPromise().then(res => {
                    initialRuntimeId = res.reply.runtimeId;
                    return this.system.restartServer(this.serverId)
                        .catch(() => {
                            this.system.currentServerNotBusy = true;
                            this.toastService.show(this.LANG.servers.restartFailed, options);
                        });
                })
                    .catch(() => {
                        this.system.currentServerNotBusy = true;
                        this.toastService.show(this.LANG.servers.getModuleFailed, options);
                    });
            }, { successMessage: this.LANG.servers.beginRestart })
            .then(() => {
                this.close(this.CONFIG.servers.status.restarting);
                const serverSubscription = this.system.getModuleInfo(this.serverId)
                    .pipe(
                        map((res: any) => {
                            if (res.reply.id !== this.serverId) {
                                throw Error('server id should be the same');
                            }
                            if (res.reply.runtimeId === initialRuntimeId) {
                                throw Error('runtime id should be different after restart');
                            }
                        }),
                        retryWhen(errors =>
                            errors.pipe(delayWhen(() =>
                                timer(4000)
                            ))
                        )
                    )
                    .subscribe(() => {
                        this.system.currentServerNotBusy = true;
                        this.system.systemInfo = this.system;
                        options.classname = this.CONFIG.toast.success;
                        this.toastService.show(this.LANG.servers.restartSuccessful, options);
                        serverSubscription.unsubscribe();
                    });
            });
    }

    close(msg) {
        this.activeModal.close(msg);
    }
}
