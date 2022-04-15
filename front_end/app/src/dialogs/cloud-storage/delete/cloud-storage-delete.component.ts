import { HttpClient } from '@angular/common/http';
import {
    Component,
    Input,
    Renderer2,
    ViewChild,
    OnInit,
    Inject
} from '@angular/core';
import type { NgForm } from '@angular/forms';
import { BehaviorSubject } from 'rxjs';

import { LanguageI18NStaticTypes } from '@app/language_i18n_static_types';
import { DIALOG_DATA, DialogRef } from '@dialogs/dialog-ref';
import * as t from '@services/nx-cloud-api/nx-cloud-api.types';
import type { IConfig } from '@services/nx-config/config-types';
import { NxConfigService } from '@services/nx-config/nx-config.service';
import { NxLanguageProviderService } from '@services/nx-language-provider';
import { NxProcessService } from '@services/process.service';
import { Process } from '@services/process.service/process';
import type { NxSystem } from '@services/system.service/system';
import { pickFrom } from '@utils/general';

@Component({
    selector: 'nx-modal-cloud-storage-delete-content',
    templateUrl: 'cloud-storage-delete.component.html',
    styleUrls: []
})
export class CloudStorageDeleteModalContent implements OnInit {
    @Input() closable: boolean = true;

    system$: BehaviorSubject<NxSystem>;
    updateCallback: () => void;
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
        private http: HttpClient,
        private processService: NxProcessService,
        private renderer: Renderer2,
        private dialogRef: DialogRef,
        @Inject(DIALOG_DATA) private dialogData: any,
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

    ngOnInit(): void {
        pickFrom(this.dialogData, ['system$', 'updateCallback'], this);

        this.auth.password = '';
        this.system$.subscribe(system => {
            if (system?.id) {
                this.systemId = system.id;
            }
        });

        this.delete = this.processService.createProcess(() => {
            this.deleteForm.controls.password.setErrors(undefined);
            this.wrongPassword = false;
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
            this.close(true);
        });
    }

    close = (msg?: boolean) => {
        this.dialogRef.close(msg);
    };
}
