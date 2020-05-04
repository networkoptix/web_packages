import { Component, Input }          from '@angular/core';
import { NgbActiveModal }            from '@ng-bootstrap/ng-bootstrap';
import { timer }                     from 'rxjs';
import {
    delayWhen, retryWhen, map,
    tap, mergeMap
}                                    from 'rxjs/operators';
import { NxLanguageProviderService } from '../../services/nx-language-provider';
import { NxRibbonService }           from '../../components/ribbon';
import { NxProcessService }          from '../../services/process.service';
import { NxConfigService, IConfig }  from '../../services';
import { NxToastService }            from '../toast.service';
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
        private ribbonService: NxRibbonService,
        private toastService: NxToastService
    ) {
        this.CONFIG = configService.getConfig();
        this.LANG = languageService.getTranslations();
    }

    ngOnInit() {
        const options      = {
            classname : this.CONFIG.toast.warning,
            autohide  : true,
            delay     : this.CONFIG.alertTimeout
        };
        this.restartServer = this.processService
            .createProcess(() => {
                return this.system.restartServer(this.serverId)
                    .catch(() => {
                        this.system.currentServerNotBusy = true;
                        this.toastService.show(this.LANG.servers.restartFailed, options);
                    });
            })
            .then(() => {
                this.close(this.CONFIG.servers.status.restarting);
                let isFirstTime = true;
                const serverSubscription = this.system.getServers()
                    .pipe(
                        map((res: any) => {
                            if (isFirstTime) {
                                isFirstTime = false;
                                throw Error('retry once');
                            }
                            if (res) {
                                const serverObj: { id?: string } = {};
                                Object.entries(res).forEach((server: [string, { id: string, status: string}]) => {
                                    serverObj[server[1].id] = server[1].status;
                                });
                                if (!serverObj[this.serverId]) {
                                    throw Error('server not found');
                                }
                                if (serverObj[this.serverId] !== 'Online') {
                                    throw Error('still restarting');
                                }
                                return serverObj;
                            }
                        }),
                        mergeMap(serverObj => {
                            if (Object.keys(serverObj).length === 1) {
                                return this.system.getInfo(true, false)
                                    .then(system => {
                                        if (!system.isOnline) {
                                            this.ribbonService.show(this.LANG.ribbon.systemOffline, '', '', 'alert');
                                            throw Error('system is offline still');
                                        }
                                    })
                                    .catch(err => { throw Error(err); });
                            }
                        }),
                        retryWhen(errors => {
                            return errors.pipe(
                                tap(val => {
                                    if ([502, 503].includes(val.status) && isFirstTime) {
                                        isFirstTime = false;
                                        this.ribbonService.show(this.LANG.ribbon.systemOffline, '', '', 'alert');
                                    }
                                }),
                                delayWhen(() => timer(4000))
                            );
                        })
                    )
                    .subscribe(() => {
                        this.ribbonService.hide();
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
