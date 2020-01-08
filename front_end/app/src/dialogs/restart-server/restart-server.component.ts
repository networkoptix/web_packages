import { Component, Input }            from '@angular/core';
import { NgbActiveModal }              from '@ng-bootstrap/ng-bootstrap';
import { NxLanguageProviderService }   from '../../services/nx-language-provider';
import { NxProcessService }            from '../../services/process.service';
import { NxToastService }              from '../../dialogs/toast.service';
import { NxConfigService }             from '../../services/nx-config';
import { timer }                       from 'rxjs';
import { delayWhen, retryWhen, map }   from 'rxjs/operators';

@Component({
    selector: 'nx-modal-restart-server-content',
    templateUrl: 'restart-server.component.html',
    styleUrls: []
})
export class RestartServerModalContent {
    @Input() system: any;
    @Input() serverName: string;
    @Input() serverId;
    @Input() closable;

    LANG: any;
    CONFIG: any;
    restartServer: any;

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
        this.restartServer = this.processService
            .createProcess(() => {
                const options = {
                    classname: 'success',
                    autohide: true,
                    delay: this.CONFIG.alertTimeout
                };
                let initialRuntimeId;
                return this.system.getModuleInfo(this.serverId).toPromise().then(res => {
                    initialRuntimeId = res.reply.runtimeId;
                    this.activeModal.close('restarting');
                    this.system.restartServer(this.serverId).then(() => {
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
                                this.toastService.show(this.LANG.servers.restartSuccessful, options);
                                serverSubscription.unsubscribe();
                            });
                        })
                        .catch(() => {
                            options.classname = 'warning';
                            this.toastService.show(this.LANG.servers.restartFailed, options);
                        });
                    })
                    .catch(() => {
                        options.classname = 'warning';
                        this.toastService.show(this.LANG.servers.getModuleFailed, options);
                    });
            }, { successMessage: this.LANG.servers.beginRestart });
    }

    close() {
        this.activeModal.close();
    }
}