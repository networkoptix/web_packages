import { Component, Input }          from '@angular/core';
import { NgbActiveModal }            from '@ng-bootstrap/ng-bootstrap';
import { timer }                     from 'rxjs';
import { delayWhen, retryWhen, map } from 'rxjs/operators';

import { NxProcessService, Process } from '@services/process.service';
import { NxLanguageProviderService } from '@services/nx-language-provider';
import { NxConfigService, IConfig }  from '@services/nx-config';
import { NxSystem }                  from '@services/system.service';
import { NxToastService }            from '@dialogs/toast.service';
import { LanguageI18NStaticTypes }   from '@app/language_i18n_static_types';
import { ModuleInformationReply, NormalResponse } from '@services/system-api.types';
import {NxAppStateService} from "@services/nx-app-state.service";

@Component({
    selector    : 'nx-modal-reset-server-content',
    templateUrl : 'reset-server.component.html',
    styleUrls   : []
})
export class ResetServerModalContent {
    @Input() system: NxSystem;
    @Input() serverName: string;
    @Input() serverId: string;
    @Input() closable: boolean;

    LANG: LanguageI18NStaticTypes;
    CONFIG: IConfig;
    resetServer: Process;
    password: string;
    hideErrors = true;

    constructor(
        configService: NxConfigService,
        languageService: NxLanguageProviderService,
        public activeModal: NgbActiveModal,
        private appState: NxAppStateService,
        private processService: NxProcessService,
        private toastService: NxToastService
    ) {
        this.LANG = languageService.translations;
        this.CONFIG = configService.getConfig();
    }

    ngOnInit() {
        const options = {
            classname : this.CONFIG.toast.warning,
            autohide  : true,
            delay     : this.CONFIG.alertTimeout
        };
        const handleResetFailError = (from: string, error) => {
            console.error(`Error in reset-server dialog from ${from}:`, error);
            this.toastService.show(this.LANG.servers.resetFailed?.(), options);
        };

        const wrongPasswordHandler = () => {
            this.toastService.show(this.LANG.servers.resetFailed?.(), options);
            return false;
        };

        this.resetServer = this.processService
            .createProcess(() => {
                return this.system.restoreFactorySettings(this.serverId, this.password).toPromise();
            }, {
                ignoreError        : true,
                ignoreUnauthorized : true,
                successMessage     : this.LANG.servers.beginReset?.(),
                errorCodes         : {
                    'Wrong password.' : wrongPasswordHandler,
                    wrongPassword     : wrongPasswordHandler
                }
            }, async() => {
                let moduleInfo: NormalResponse<ModuleInformationReply>;
                try {
                    moduleInfo = await this.system.getModuleInfo(this.serverId).toPromise();
                } catch (err) {
                    if (![503, 504].includes(err.status)) {
                        return handleResetFailError('getModuleInfo', err);
                    } else if (this.CONFIG.isLocal) {
                        // If we failed to get module info the system probably has only one server.
                        this.activeModal.close();
                        this.appState.systemAvailable$.next(false);
                    }
                }
                const { runtimeId: initialRuntimeId } = moduleInfo.reply;
                return this.system.restartServer(this.serverId)
                    .then(() => {
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
                            .subscribe(
                                () => {
                                    this.system.currentServerNotBusy = true;
                                    this.system.systemInfo = this.system;
                                    this.activeModal.close();
                                    const successMessage = NxLanguageProviderService.translate(this.LANG.servers.resetSuccessful?.(), { serverName: this.serverName });
                                    options.classname = this.CONFIG.toast.success;
                                    this.toastService.show(successMessage, options);
                                    serverSubscription.unsubscribe();
                                },
                                err => {
                                    console.error('error in reset-server dialog', err);
                                    this.system.currentServerNotBusy = true;
                                    return handleResetFailError('getModule post restart', err);
                                }
                            );
                    })
                    .catch(err => handleResetFailError('restartServer', err));
            });
    }

    close() {
        this.activeModal.close();
    }
}
