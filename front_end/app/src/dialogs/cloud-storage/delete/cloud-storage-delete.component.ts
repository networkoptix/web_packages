import {
    Component, Input,
    Renderer2, ViewChild, OnInit
}                                    from '@angular/core';
import { NgbActiveModal }            from '@ng-bootstrap/ng-bootstrap';
import { BehaviorSubject }           from 'rxjs';

import { NxLanguageProviderService } from '@services/nx-language-provider';
import { NxProcessService, Process } from '@services/process.service';
import { NxSystem }                  from '@services/system.service';
import { NxConfigService, IConfig }  from '@services/nx-config';
import { NxCloudApiService }         from '@services/nx-cloud-api';
import { LanguageI18NStaticTypes }   from '@app/language_i18n_static_types';

@Component({
    selector: 'nx-modal-cloud-storage-delete-content',
    templateUrl: 'cloud-storage-delete.component.html',
    styleUrls: []
})
export class CloudStorageDeleteModalContent implements OnInit {
    @Input() system$: BehaviorSubject<NxSystem>;
    @Input() updateCallback: () => void;
    @Input() closable: boolean;

    LANG: LanguageI18NStaticTypes;
    CONFIG: IConfig;
    wrongPassword: boolean;
    delete: Process;

    systemId = '';
    auth = {
        password: ''
    };

    @ViewChild('deleteForm', { static: true }) deleteForm: HTMLFormElement;

    constructor(
        config: NxConfigService,
        language: NxLanguageProviderService,
        public activeModal: NgbActiveModal,
        private processService: NxProcessService,
        private renderer: Renderer2,
        private cloudApiService: NxCloudApiService
    ) {
        this.LANG = language.translations;
        this.CONFIG = config.getConfig();
    }

    ngOnInit() {
        this.auth.password = '';
        this.system$.subscribe(system => {
            if (system?.id) {
                this.systemId = system.id;
            };
        });

        this.delete = this.processService.createProcess(() => {
            this.deleteForm.controls.password.setErrors(undefined);
            this.wrongPassword = false;
            const { LANG } = this;
            return this.cloudApiService.deleteCloudStorage(this.systemId, this.auth.password);
        }, {
            errorCodes: {
                500: () => {
                    return this.LANG.common.systemServerError?.();
                },
                notFound: () => {
                    return this.LANG.dialogs.cloudStorage.moveCloudStorage.notFound?.();
                },
                cloudInvalidResponse: () => {
                    this.wrongPassword = true;
                    this.deleteForm.controls.password.setErrors({ password: true });
                    this.renderer.selectRootElement('#password').focus?.();
                    return this.LANG.errorCodes.notAuthorized?.();
                },
                networkConnection: () => {
                    return this.LANG.errorCodes.networkConnection();
                }
            },
            successMessage: this.LANG.dialogs.cloudStorage.remove.success?.(),
            errorPrefix: this.LANG.dialogs.cloudStorage.remove.errorPrefix?.()
        }).then(() => {
            this.updateCallback();
            this.activeModal.close(true);
        });
    }

    close() {
        this.activeModal.close();
    }
}
