import { Component, Input }            from '@angular/core';
import {
    FormGroup, FormControl, Validators
}                                      from '@angular/forms';
import { NgbActiveModal }              from '@ng-bootstrap/ng-bootstrap';
import { UntilDestroy }                from '@ngneat/until-destroy';
import { Subscription }                from 'rxjs';

import { NxConfigService, IConfig }  from '../../services/nx-config';
import { NxLanguageProviderService } from '../../services/nx-language-provider';
import { NxProcessService, Process } from '../../services/process.service';
import { NxSystem }                  from '../../services/system.service';
import { NxToastService }            from '../toast.service';
import { LanguageI18NStaticTypes }   from '../../../language_i18n_static_types';

@UntilDestroy({ checkProperties: true })
@Component({
    selector    : 'nx-modal-add-storage',
    templateUrl : 'add-storage.component.html',
    styleUrls   : ['add-storage.component.scss']
})
export class AddStorageModalContent {
    @Input() system: NxSystem;
    @Input() serverId: string;
    @Input() storage: any[];
    @Input() systemStorages: any[];
    @Input() closable: boolean;
    storageForm: FormGroup;

    LANG: LanguageI18NStaticTypes;
    CONFIG: IConfig;

    storageFormValueSubscription: Subscription;

    addStorage: Process;
    url: string;
    alreadyUsed: string;
    alreadyExists = false;
    urlChecked = false;
    loginChecked = false;
    passwordChecked = false;

    constructor(
        configService: NxConfigService,
        language: NxLanguageProviderService,
        public activeModal: NgbActiveModal,
        private processService: NxProcessService,
        private toastService: NxToastService
    ) {
        this.CONFIG = configService.getConfig();
        this.LANG = language.translations;
    }

    checkUrlValidity() {
        const urlC = this.getControls('url');
        if (
            urlC.touched && urlC.errors && !urlC.errors.required &&
            (urlC.errors.alreadyExists || urlC.errors.forbiddenUrl)
        ) {
            this.urlChecked = true; // shows error border around input
        }
    }

    validateUrl = (control: FormControl): { [key: string]: any } | null => {
        const alreadyExistingUrl = this.storage.find(s => s.url === control.value?.substr(1));
        if (alreadyExistingUrl) {
            return { alreadyExists: true };
        }
        const ipReg     = new RegExp(/^(\/\/)(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})\/.+/);
        const domainReg = new RegExp(/^(\/\/).+\/.+/);
        const forbidden = !ipReg.test(control.value) && !domainReg.test(control.value);
        return forbidden ? { forbiddenUrl: true } : null;
    }

    ngOnInit() {
        this.storageForm = new FormGroup({
            url      : new FormControl(null, [Validators.required, this.validateUrl.bind(this)]),
            login    : new FormControl(null, [Validators.required]),
            password : new FormControl(null, [Validators.required])
        });

        this.storageFormValueSubscription = this.storageForm.valueChanges.subscribe(values => {
            for (const field in values) {
                if (values[field]) {
                    if (['login', 'password'].includes(field)) {
                        // resets form for just loginPasswordWrong error
                        if (this.loginChecked || this.passwordChecked) {
                            const loginErrors = this.storageForm.controls.login.errors;
                            if (loginErrors?.loginPasswordWrong) {
                                delete loginErrors.loginPasswordWrong;
                            }
                            this.loginChecked = !!loginErrors?.required;
                            this.storageForm.controls.login.setErrors(loginErrors);
                            const passwordErrors = this.storageForm.controls.password.errors;
                            if (passwordErrors?.loginPasswordWrong) {
                                delete passwordErrors.loginPasswordWrong;
                            }
                            this.passwordChecked = !!passwordErrors?.required;
                            this.storageForm.controls.password.setErrors(passwordErrors);
                        }
                    } else if (field === 'url') {
                        this.urlChecked = false;
                        this.url = values[field];
                        this.checkUrlValidity();
                    }
                }
            }
        });

        const options = {
            classname : this.CONFIG.toast.warning,
            autohide  : true,
            delay     : this.CONFIG.alertTimeout
        };
        this.addStorage = this.processService
            .createProcess(() => {
                const { url, login, password } = this.storageForm.value;
                const storageExistsOnSystem = !this.alreadyExists && this.systemStorages.find(s => s.url === url.substr(1));
                return storageExistsOnSystem ? Promise.reject(Error('alreadyExists'))
                    : this.addStorageProcess(url, login, password);
            }, { ignoreError: true })
            .then(
                (res: any) => {
                    let message = this.LANG.storage.failed();
                    if (res.id) {
                        options.classname = this.CONFIG.toast.success;
                        message = this.LANG.storage.success();
                    }
                    this.storageForm.reset();
                    this.activeModal.close(res.id && this.CONFIG.responseOk);
                    this.toastService.show(message, options);
                },
                err => {
                    if (err?.message === 'alreadyExists') {
                        this.alreadyUsed = NxLanguageProviderService.translate(this.LANG.storage.alreadyUsed, { url: this.url });
                        this.alreadyExists = true;
                    } else if (err?.message === 'WrongAuth') {
                        this.passwordChecked = true;
                        this.loginChecked = true;
                        this.storageForm.controls.password.setErrors({ loginPasswordWrong: true });
                        this.storageForm.controls.login.setErrors({ loginPasswordWrong: true });
                    } else {
                        let message = this.LANG.storage.failed();
                        if (['SystemOffline', 'Timeout has occurred'].includes(err?.message)) {
                            this.system.systemInfo = this.system;
                            message = this.LANG.storage.serverOffline();
                        }
                        this.storageForm.reset();
                        this.activeModal.close();
                        this.toastService.show(message, options);
                    }
                }
            );
    }

    async addStorageProcess(url: string, login: string, password: string) {
        try {
            const smbShare = `smb://${login}:${password}@${url.substr(2)}`;
            const { reply } = await this.system.getStorageStatus({ path: smbShare }).toPromise();
            if (!reply) {
                return Promise.reject(Error('SystemOffline'));
            }
            // miscellaneous errors from getStorageStatus
            if (['InitFailed_WrongPath', 'CreateFailed'].includes(reply.status)) {
                return Promise.reject();
            }
            if (reply.status === 'InitFailed_WrongAuth') {
                return Promise.reject(Error('WrongAuth'));
            }
            if (reply.status.toLowerCase() === this.CONFIG.responseOk && reply.storage.isWritable) {
                return this.system.saveStorage({ parentId: this.serverId, url: smbShare }).toPromise();
            }
            return Promise.reject();
        } catch (error) {
            return Promise.reject(error);
        }
    }

    getControls(field: string) {
        return this.storageForm.get(field);
    }

    preSubmit = () => {
        this.urlChecked = true;
        this.loginChecked = true;
        this.passwordChecked = true;
    }

    goBack() {
        this.alreadyExists = false;
    }

    close = () => {
        this.storageForm.reset();
        this.activeModal.close();
    }
}
