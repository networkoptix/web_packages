import {
    Component, Input, Renderer2, OnInit, ViewChild
}                                      from '@angular/core';
import { NgbActiveModal }              from '@ng-bootstrap/ng-bootstrap';
import { NxLanguageProviderService }   from '../../services/nx-language-provider';
import { NxProcessService, Process }   from '../../services/process.service';
import { NxCloudApiService }           from '../../services/nx-cloud-api';
import { LanguageI18NStaticTypes }     from '../../../language_i18n_static_types';
import { ICamera, NxSystem }           from '../../services/system.service';

@Component({
    selector    : 'nx-modal-rename-content',
    templateUrl : 'update-camera-credentials.component.html',
    styleUrls   : []
})
export class UpdateCameraCredentialsModalContent implements OnInit {
    @Input() camera: ICamera;
    @Input() system: NxSystem;
    @Input() updateCallback: () => void;
    @Input() closable;
    @ViewChild('updateForm') updateForm: HTMLFormElement;

    LANG: LanguageI18NStaticTypes;
    update: Process;
    currentCredentials: {loginName: string, password: string};
    loginName = '';
    password = '';

    constructor(
        languageService: NxLanguageProviderService,
        public activeModal: NgbActiveModal,
        private processService: NxProcessService
    ) {
        this.LANG = languageService.getTranslations();
    }

    ngOnInit() {
        const [loginName, password] = (this.camera.parsedAddParams && this.camera.parsedAddParams.defaultCredentials || ':').split(':');
        this.currentCredentials = { loginName, password };
        this.loginName = loginName;
        this.password = password;
        this.update = this.processService.createProcess(() => {
            if (this.loginName === this.currentCredentials.loginName &&
                this.password === this.currentCredentials.password
            ) {
                return Promise.resolve();
            }
            return this.system.updateCameraSettings(this.camera.id, { defaultCredentials: `${this.loginName}:${this.password}` })
                .then(_ => this.system.getCameras().then(_ => {
                    this.system.systemInfo = this.system;
                }));
        }).then(() => {
            this.activeModal.close();
            this.updateCallback();
        });
    }

    clearExistingPassword() {
        if (this.password === '******') {
            this.password = '';
        }
    }

    close() {
        this.activeModal.close();
    }
}
