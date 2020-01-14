import { Component, Input, Renderer2 } from '@angular/core';
import { NgbActiveModal }              from '@ng-bootstrap/ng-bootstrap';
import { NxLanguageProviderService }   from '../../services/nx-language-provider';
import { NxProcessService }            from '../../services/process.service';
import { NxToastService }              from '../../dialogs/toast.service';
import { NxConfigService }             from '../../services/nx-config';
import { NxCloudApiService }           from '../../services/nx-cloud-api';
import { timer }                       from 'rxjs';
import { delayWhen, retryWhen, map }   from 'rxjs/operators';

@Component({
    selector: 'nx-modal-reset-server-content',
    templateUrl: 'reset-server.component.html',
    styleUrls: []
})
export class ResetServerModalContent {
    @Input() system: any;
    @Input() serverName: string;
    @Input() serverId;
    @Input() closable;

    LANG: any;
    CONFIG: any;
    resetServer: any;
    password: string;

    constructor(private activeModal: NgbActiveModal,
                private language: NxLanguageProviderService,
                private processService: NxProcessService,
                private configService: NxConfigService,
                private toastService: NxToastService,
    ) {
        this.LANG = this.language.getTranslations();
        this.CONFIG = this.configService.getConfig();
    }

    ngOnInit() {
        this.resetServer = this.processService
            .createProcess(() => {
                const options = {
                    classname: 'warning',
                    autohide: true,
                    delay: this.CONFIG.alertTimeout
                };
                return this.system.restoreFactorySettings(this.serverId, this.password).toPromise().then(res => {
                    console.log('res in restoreFactorySettings', res);
                    this.activeModal.close();
                    let initialRuntimeId;
                    this.system.getModuleInfo(this.serverId).toPromise().then(res => {
                        initialRuntimeId = res.reply.runtimeId;
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
                                    const successMessage = this.LANG.servers.resetSuccessful.replace('{{ serverName }}', this.serverName);
                                    options.classname = 'success';
                                    this.toastService.show(successMessage, options);
                                    serverSubscription.unsubscribe();
                                });
                        })
                        .catch(() => this.toastService.show(this.LANG.servers.restartFailed, options));
                    })
                    .catch(() => this.toastService.show(this.LANG.servers.getModuleFailed, options));
                })
                .catch(() => this.toastService.show(this.LANG.servers.resetFailed, options));
            }, { successMessage: this.LANG.servers.beginReset });
    }

    close() {
        this.activeModal.close();
    }
}