import {
    Component, Input, OnInit, ViewChild
}                                      from '@angular/core';
import { NgbActiveModal }              from '@ng-bootstrap/ng-bootstrap';
import { NxLanguageProviderService }   from '../../services/nx-language-provider';
import { NxProcessService, Process }   from '../../services/process.service';
import { ICamera, NxSystem }           from '../../services';
import { LanguageI18NStaticTypes }     from '../../../language_i18n_static_types';

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
    cameraLoginCredentials = '';
    cameraPasswordCredentials = '';

    constructor(
        languageService: NxLanguageProviderService,
        public activeModal: NgbActiveModal,
        private processService: NxProcessService
    ) {
        this.LANG = languageService.getTranslations();
    }

    ngOnInit() {
        this.update = this.processService.createProcess(() => {
            return this.system.updateCameraSettings(this.camera.id, { credentials: `${this.cameraLoginCredentials}:${this.cameraPasswordCredentials}` })
                .then(_ => this.system.getCameras().then(_ => {
                    this.system.systemInfo = this.system;
                }));
        }).then(() => {
            this.activeModal.close();
            this.updateCallback();
        });
    }

    close() {
        this.activeModal.close();
    }
}
