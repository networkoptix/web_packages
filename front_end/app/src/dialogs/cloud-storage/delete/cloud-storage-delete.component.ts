import { HttpClient } from '@angular/common/http';
import {
    Component,
    Input,
    Renderer2,
    ViewChild,
    OnInit
} from '@angular/core';
import type { NgForm } from '@angular/forms';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { BehaviorSubject } from 'rxjs';

import { LanguageI18NStaticTypes } from '@app/language_i18n_static_types';
import * as t from '@services/nx-cloud-api.types';
import { NxConfigService, IConfig } from '@services/nx-config';
import { NxLanguageProviderService } from '@services/nx-language-provider';
import { NxProcessService, Process } from '@services/process.service';
import { NxSystem } from '@services/system.service';

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

    @ViewChild('deleteForm', { static: true }) deleteForm: NgForm;

    constructor(
        config: NxConfigService,
        language: NxLanguageProviderService,
        public activeModal: NgbActiveModal,
        private http: HttpClient,
        private processService: NxProcessService,
        private renderer: Renderer2
    ) {
        this.LANG = language.translations;
        this.CONFIG = config.getConfig();
    }

    private deleteCloudStorage(systemId: string, password: string) {
        return this.http.post<t.CloudResponse>(
            this.CONFIG.apiBase + '/storage/delete',
            { systemId, password }
        ).toPromise();
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
            return this.deleteCloudStorage(this.systemId, this.auth.password);
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
