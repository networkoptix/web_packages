import { Component, Input, ViewChild } from '@angular/core';
import { NgbActiveModal }              from '@ng-bootstrap/ng-bootstrap';
import { BehaviorSubject }             from 'rxjs';

import { NxConfigService, IConfig }    from '../../services/nx-config';
import { NxLanguageProviderService }   from '../../services/nx-language-provider';
import { NxProcessService, Process }   from '../../services/process.service';
import { LanguageI18NStaticTypes }     from '../../../language_i18n_static_types';

@Component({
    selector    : 'nx-modal-add-storage-content',
    templateUrl : 'add-storage.component.html',
    styleUrls   : []
})
export class AddStorageModalContent {
    @Input() system;
    @Input() serverId;
    @Input() closable;
    @ViewChild('addStorageForm') form;

    LANG: LanguageI18NStaticTypes;
    CONFIG: IConfig;

    addStorage: Process;
    auth: any;
    url: string;
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
        this.auth = {
            username : '',
            password : ''
        };

        this.url = '';
        this.wrongPassword = '';

        this.addStorage = this.processService.createProcess(() => {
            return this.system.saveStorage();
        })
            .then((user) => {
                if (user) {
                    this.activeModal.close(user.id);
                }
            });
    }
}
