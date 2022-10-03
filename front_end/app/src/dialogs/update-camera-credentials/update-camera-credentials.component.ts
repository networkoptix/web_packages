import {
    Component,
    Input,
    OnInit,
    ViewChild
} from '@angular/core';
import type { NgForm } from '@angular/forms';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';

import { LanguageI18NStaticTypes } from '@app/language_i18n_static_types';
import { NxLanguageProviderService } from '@services/nx-language-provider';
import { NxProcessService, Process } from '@services/process.service';
import { NxSystem, ICamera } from '@services/system.service';

@Component({
    selector: 'nx-modal-rename-content',
    templateUrl: 'update-camera-credentials.component.html',
    styleUrls: []
})
export class UpdateCameraCredentialsModalContent implements OnInit {
    @Input() camera: ICamera;
    @Input() system: NxSystem;
    @Input() updateCallback: () => Promise<any>;
    @Input() closable;
    @ViewChild('updateForm') updateForm: NgForm;

    LANG: LanguageI18NStaticTypes;
    update: Process;
    currentCredentials: {loginName: string, password: string};
    cameraLoginCredentials = '';
    cameraPasswordCredentials = '';

    constructor(
        languageService: NxLanguageProviderService,
        public activeModal: NgbActiveModal,
        private processService: NxProcessService
    ) {
        this.LANG = languageService.translations;
    }

    clearPassword() {
        if (this.cameraPasswordCredentials === '******') {
            this.cameraPasswordCredentials = '';
        }
    }

    ngOnInit() {
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
            return this.system.updateResource(
                this.camera.id,
                { credentials: `${this.cameraLoginCredentials}:${this.cameraPasswordCredentials}` }
            ).then(this.updateCallback);
        }).then(() => {
            this.activeModal.close();
        });
    }

    close() {
        this.activeModal.close();
    }
}
