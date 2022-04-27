import {
    Component,
    Inject,
    Input,
    OnInit,
    ViewChild
} from '@angular/core';
import type { NgForm } from '@angular/forms';

import { LanguageI18NStaticTypes } from '@app/language_i18n_static_types';
import { DIALOG_DATA, DialogRef } from '@dialogs/dialog-ref';
import { NxLanguageProviderService } from '@services/nx-language-provider';
import { NxProcessService } from '@services/process.service';
import { Process } from '@services/process.service/process';
import type {
    ICamera
} from '@services/system.service/camera-manager/camera-manager-types';
import type { NxSystem } from '@services/system.service/system';
import { pickFrom } from '@utils/general';

@Component({
    selector: 'nx-modal-rename-content',
    templateUrl: 'update-camera-credentials.component.html',
    styleUrls: []
})
export class UpdateCameraCredentialsModalContent implements OnInit {
    @Input() closable = true;
    @ViewChild('updateForm') updateForm: NgForm;

    LANG: LanguageI18NStaticTypes;
    update: Process;

    camera: ICamera;
    system: NxSystem;
    updateCallback: () => Promise<any>;
    currentCredentials: { loginName: string, password: string };
    cameraLoginCredentials = '';
    cameraPasswordCredentials = '';

    constructor(
        languageService: NxLanguageProviderService,
        private processService: NxProcessService,
        private dialogRef: DialogRef,
        @Inject(DIALOG_DATA) private dialogData: any,
    ) {
        this.LANG = languageService.translations;
    }

    clearPassword(): void {
        if (this.cameraPasswordCredentials === '******') {
            this.cameraPasswordCredentials = '';
        }
    }

    ngOnInit(): void {
        pickFrom(this.dialogData, ['system', 'camera', 'updateCallback'], this);

        const [loginName, password] = (
            this.camera.parsedAddParams && this.camera.parsedAddParams.credentials ||
            ':'
        ).split(':');
        this.currentCredentials = { loginName, password };
        this.cameraLoginCredentials = loginName;
        this.cameraPasswordCredentials = loginName && password;
        this.update = this.processService.createProcess(() => {
            if (
                this.cameraLoginCredentials === this.currentCredentials.loginName &&
                this.cameraPasswordCredentials === this.currentCredentials.password
            ) {
                return Promise.resolve();
            }
            return this.system.serverManager.updateResource(
                this.camera.id,
                { credentials: `${this.cameraLoginCredentials}:${this.cameraPasswordCredentials}` }
            ).then(this.updateCallback);
        }).then(() => {
            this.close();
        });
    }

    close = (): void => {
        this.dialogRef.close();
    };
}
