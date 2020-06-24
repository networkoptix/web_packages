import {
    Component, Input,
    Renderer2, ViewChild
}                                    from '@angular/core';
import { NgbActiveModal }            from '@ng-bootstrap/ng-bootstrap';
import { NxLanguageProviderService } from '../../services/nx-language-provider';
import { NxProcessService, Process }          from '../../services/process.service';
import { NxCloudApiService }         from '../../services/nx-cloud-api';
import { LanguageI18NStaticTypes }   from '../../../language_i18n_static_types';
import {IConfig, NxConfigService} from "../../services/nx-config";
import {NxSystemAPI, NxSystemAPIService} from "../../services/system-api.service";
import {of} from "rxjs";
import {NxAccountService} from "../../services/account.service";

@Component({
    selector : 'nx-modal-disconnect-content',
    templateUrl : 'disconnect.component.html',
    styleUrls : []
})
export class DisconnectModalContent {
    @Input() system;
    @Input() disconnect: Process;
    @Input() closable;

    LANG: LanguageI18NStaticTypes;
    CONFIG: IConfig;
    password: string;
    wrongPassword: boolean;
    auth = {
        username: '',
        password: ''
    };

    mediaServerApi: NxSystemAPI;

    @ViewChild('disconnectForm', { static: true }) disconnectForm: HTMLFormElement;

    constructor(
        language: NxLanguageProviderService,
        configService: NxConfigService,
        public activeModal: NgbActiveModal,
        private processService: NxProcessService,
        private cloudApiService: NxCloudApiService,
        private renderer: Renderer2,
        private systemApiService: NxSystemAPIService,
        private accountService: NxAccountService
    ) {
        this.LANG = language.translations;
        this.CONFIG = configService.getConfig();
    }

    ngOnInit() {
        this.auth.password = '';
        this.accountService
            .get()
            .then((account) => {
                if (account) {
                    this.auth.username = NxConfigService.isLocal ? account.first_name : account.email;
                }
            });

        this.disconnect = this.processService.createProcess(() => {
            this.disconnectForm.controls.password.setErrors(undefined);
            this.wrongPassword = false;

            if (this.CONFIG.isLocal) {
                return this.disconnectLocal(this.auth.password);
            }
            return this.cloudApiService.disconnect(this.system.id, this.auth.password).toPromise();
        }, {
            ignoreUnauthorized : true,
            errorCodes         : {
                wrongPassword: () => {
                    this.wrongPassword = true;
                    this.auth.password = '';

                    this.renderer.selectRootElement('#password').focus();
                }
            },
            successMessage : this.LANG.toastMessage.system.disconnected.success(),
            errorPrefix    : this.LANG.errorCodes.cantDisconnectSystemPrefix()
        }).then(() => {
            this.activeModal.close(true);
        });
    }

    close() {
        this.activeModal.close();
    }

    private disconnectLocal(password) {
        this.mediaServerApi = this.systemApiService
            .createConnection(undefined, undefined, undefined, () => of(''));

        return this.mediaServerApi.disconnectFromCloud(password);
    }
}
