import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import {
    Component,
    Inject,
    OnInit,
} from '@angular/core';
import { firstValueFrom } from 'rxjs';

import staticLang from '@common/language/language_i18n_static.json';
import type { UpdateCameraCredentials as DT } from '@dialogs/dialogs.types';
import { ModalBase } from '@dialogs/modal-base';
import { NxProcessService } from '@services/process.service';
import { Process } from '@services/process.service/process';
import { NxSystemRestAPI } from '@services/system-rest-api.service';
import type {
    NxSystemCamera
} from '@services/system.service/camera-manager/camera-manager-types';
import type { NxSystem } from '@services/system.service/system';
import { assignFrom } from '@utils/general';

@Component({
    selector: 'nx-modal-rename-content',
    templateUrl: 'update-camera-credentials.component.html',
    styleUrls: [],
})
export class UpdateCameraCredentialsModalContent extends ModalBase<DT['return']> implements OnInit {
    LANG = staticLang;
    update: Process;

    camera: NxSystemCamera;
    system: NxSystem;
    updateCallback: () => Promise<void>;
    currentCredentials: { loginName: string; password: string };
    cameraLoginCredentials = '';
    cameraPasswordCredentials = '';
    confirmPassword = '';
    defaultPassword: boolean;
    error = '';

    constructor(
        private processService: NxProcessService,
        dialogRef: DialogRef<DT['return']>,
        @Inject(DIALOG_DATA) private dialogData: DT['data'],
    ) {
        super(dialogRef);
    }

    clearPassword(): void {
        if (this.cameraPasswordCredentials === '******') {
            this.cameraPasswordCredentials = '';
        }
    }

    clearError(): void {
        this.error = '';
    }

    ngOnInit(): void {
        assignFrom(this.dialogData, ['system', 'camera', 'updateCallback'], this);
        if (this.dialogData.defaultPassword) {
            this.defaultPassword = this.dialogData.defaultPassword;
        }

        const [loginName, password] = this.camera.addParams.credentials
            ? this.camera.addParams.credentials.split(':')
            : ['', ''];
        this.currentCredentials = { loginName, password };
        this.cameraLoginCredentials = loginName;
        this.cameraPasswordCredentials = (!this.defaultPassword && loginName) ? password : '';
        this.update = this.processService.createProcess(() => {
            this.lock();
            if (this.defaultPassword && this.cameraPasswordCredentials !== this.confirmPassword) {
                this.unlock();
                return Promise.reject('mismatch');
            }
            if (
                this.cameraLoginCredentials === this.currentCredentials.loginName &&
                this.cameraPasswordCredentials === this.currentCredentials.password
            ) {
                return Promise.resolve();
            }
            const updateHandler = (defaultPassword?: boolean): Promise<unknown> => {
                if (defaultPassword && this.system.mediaserver instanceof NxSystemRestAPI) {
                    return firstValueFrom(this.system.mediaserver.changePassword(this.camera.id, this.cameraLoginCredentials, this.cameraPasswordCredentials));
                }
                return this.system.serverManager.updateResource(
                    this.camera.id,
                    { credentials: `${this.cameraLoginCredentials || 'admin'}:${this.cameraPasswordCredentials}` }
                );
            };

            return updateHandler(this.defaultPassword).then(this.updateCallback);
        }, { ignoreError: true },
        () => {
            this.close();
        },
        err => {
            this.error = staticLang.dialogs.updateCameraCredentials[err];
        });
    }
}
