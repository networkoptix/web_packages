import { Component, Input, ViewChild } from '@angular/core';
import { NgbActiveModal }              from '@ng-bootstrap/ng-bootstrap';

import { NxConfigService, IConfig }  from '../../services/nx-config';
import { NxLanguageProviderService } from '../../services/nx-language-provider';
import { NxProcessService, Process } from '../../services/process.service';
import { LanguageI18NStaticTypes }   from '../../../language_i18n_static_types';
import { NxSystem }                  from '../../services/system.service';

@Component({
    selector    : 'nx-modal-add-storage-content',
    templateUrl : 'add-storage.component.html',
    styleUrls   : []
})
export class AddStorageModalContent {
    @Input() system: NxSystem;
    @Input() serverId: string;
    @Input() closable: boolean;
    @ViewChild('addStorageForm') form;

    LANG: LanguageI18NStaticTypes;
    CONFIG: IConfig;

    addStorage: Process;
    storage: any;
    wrongPassword: any;

    constructor(
        configService: NxConfigService,
        language: NxLanguageProviderService,
        public activeModal: NgbActiveModal,
        private processService: NxProcessService
    ) {
        this.CONFIG = configService.getConfig();
        this.LANG = language.translations;
    }

    ngOnInit() {
        this.storage = {
            username : '',
            password : '',
            url      : ''
        };

        this.wrongPassword = '';

        this.addStorage = this.processService
            .createProcess(() => {
                const smbShare = `smb://${this.storage.username}:${this.storage.password}@${this.storage.url.substr(2)}`;
                return this.system
                    .getStorageStatus({ path: smbShare }).toPromise()
                    .then((response) => {
                        if (response.reply.status.toLowerCase() === this.CONFIG.responseOk && response.reply.storage.isWritable) {
                            this.system
                                .saveStorage({ parentId: this.serverId, url: smbShare })
                                .toPromise()
                                .then(response => {
                                    debugger;
                                    if (response.id) {
                                        this.activeModal.close(this.CONFIG.responseOk);
                                    }
                                }, (error) => {
                                    debugger;
                                    // this.dialogsService
                                    //     .alert(this.LANG.dialogs.message.storageSettingsNotSaved, this.LANG.dialogs.titles.error)
                                    //     .catch(error => {
                                    //         console.error(error);
                                    //     });
                                }).then((res) => {
                                    return Promise.resolve(res);
                                });
                        }
                        if (response.reply.status === 'InitFailed_WrongAuth') {
                            // eslint-disable-next-line prefer-promise-reject-errors
                            return Promise.reject({ error: { resultCode: 'WrongAuth' } });
                        }
                    });
                // return this.system.getStorageStatus({ path: 'smb://user:password@host/path/to/folder' });
            }, {
                errorCodes: {
                    WrongAuth: () => {
                        debugger;
                    }
                }
            })
            .then((response) => {
                debugger;
                if (response) {
                    this.activeModal.close();
                }
            });
    }
}
