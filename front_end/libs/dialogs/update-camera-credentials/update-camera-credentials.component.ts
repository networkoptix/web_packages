import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { CommonModule } from '@angular/common';
import { Component, Inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { firstValueFrom } from 'rxjs';

import { NxProcessButtonComponent } from '@components/process-button/process-button.component';
import { NxProcessCancelButtonComponent } from '@components/process-cancel-Button/process-cancel-button.component';
import type { UpdateCameraCredentials as DT } from '@dialogs/dialogs.types';
import { ModalBase } from '@dialogs/modal-base';
import staticLang from '@language_static';
import { NxProcessService } from '@services/process.service';
import { Process } from '@services/process.service/process';
import { NxSystemRestAPI } from '@services/system-rest-api.service';
import type { Credentials } from '@services/system.service/camera-manager/camera-manager-types';

@Component({
    selector: 'nx-modal-rename-content',
    templateUrl: 'update-camera-credentials.component.html',
    styleUrls: [],
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        TranslateModule,

        NxProcessButtonComponent,
        NxProcessCancelButtonComponent,
    ],
})
export class UpdateCameraCredentialsModalContent extends ModalBase<DT['return']> {
    LANG = staticLang;
    update: Process;

    private currentCredentials: Credentials;
    cameraLoginCredentials = '';
    cameraPasswordCredentials = '';
    confirmPassword = '';
    defaultPassword: boolean;
    error = '';

    constructor(
        private processService: NxProcessService,
        dialogRef: DialogRef<DT['return']>,
        @Inject(DIALOG_DATA) { system, camera, updateCallback, defaultPassword }: DT['data'],
    ) {
        super(dialogRef);

        if (defaultPassword) {
            this.defaultPassword = defaultPassword;
        }

        const getCameraCredentials = new Promise<Credentials>(resolve => {
            if (camera.credentials) {
                resolve(camera.credentials);
            } else if (system.mediaserver.version === 5.0) {
                // 5.0 API has a bug where trying to get credentials using `_with`
                // causes the camera id to be all zeros, so we only fetch it here
                (system.mediaserver as NxSystemRestAPI)
                    .getCameraCredentials(camera.id)
                    .subscribe(credentials => resolve(credentials));
            } else {
                resolve({ user: '', password: '' });
            }
        });

        getCameraCredentials.then(credentials => {
            const { user, password } = credentials;
            this.currentCredentials = { user, password };

            this.cameraLoginCredentials = user;
            this.cameraPasswordCredentials = !this.defaultPassword && user ? password : '';
            this.update = this.processService.createProcess(
                () => {
                    this.lock();
                    if (
                        this.defaultPassword &&
                        this.cameraPasswordCredentials !== this.confirmPassword
                    ) {
                        this.unlock();
                        return Promise.reject('mismatch');
                    }
                    if (
                        this.cameraLoginCredentials === this.currentCredentials.user &&
                        this.cameraPasswordCredentials === this.currentCredentials.password
                    ) {
                        return Promise.resolve();
                    }
                    const updateHandler = async (defaultPassword?: boolean): Promise<unknown> => {
                        if (system.mediaserver instanceof NxSystemRestAPI) {
                            if (defaultPassword) {
                                await firstValueFrom(
                                    system.mediaserver.changePassword(
                                        camera.id,
                                        this.cameraLoginCredentials,
                                        this.cameraPasswordCredentials,
                                    ),
                                );
                                return updateHandler();
                            } else {
                                return firstValueFrom(
                                    system.mediaserver.updateDevicePassword(
                                        camera.id,
                                        this.cameraLoginCredentials || 'admin',
                                        this.cameraPasswordCredentials,
                                    ),
                                );
                            }
                        } else {
                            return system.serverManager.updateResource(camera.id, {
                                credentials: `${this.cameraLoginCredentials || 'admin'}:${
                                    this.cameraPasswordCredentials
                                }`,
                            });
                        }
                    };

                    return updateHandler(this.defaultPassword).then(updateCallback);
                },
                { ignoreError: true },
                () => {
                    this.close();
                },
                err => {
                    this.error = staticLang.dialogs.updateCameraCredentials[err];
                },
            );
        });
    }

    clearPassword(): void {
        if (this.cameraPasswordCredentials === '******') {
            this.cameraPasswordCredentials = '';
        }
    }

    clearError(): void {
        this.error = '';
    }
}
