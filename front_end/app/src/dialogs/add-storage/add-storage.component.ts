import { Component, Input }            from '@angular/core';
import {
    FormGroup, FormControl, Validators
}                                      from '@angular/forms';
import { NgbActiveModal }              from '@ng-bootstrap/ng-bootstrap';
import { UntilDestroy }                from '@ngneat/until-destroy';
import { Subscription }                from 'rxjs';

import { StorageManager }            from '@services/system.service/system/storage-manager/storage-manager';
import { Storage }                   from '@services/system.service/system/storage-manager/storage';
import { NxConfigService, IConfig }  from '@services/nx-config';
import { NxLanguageProviderService } from '@services/nx-language-provider';
import { NxProcessService, Process } from '@services/process.service';
import { NxSystem }                  from '@services/system.service';
import { NxToastService }            from '../toast.service';
import { LanguageI18NStaticTypes }   from '../../../language_i18n_static_types';
import { skip, take } from 'rxjs/operators';

@UntilDestroy({ checkProperties: true })
@Component({
    selector    : 'nx-modal-add-storage',
    templateUrl : 'add-storage.component.html',
    styleUrls   : ['add-storage.component.scss']
})
export class AddStorageModalContent {
    @Input() serverId: string;
    @Input() storageManager: StorageManager;
    @Input() cancelPolls: () => any
    @Input() closable: boolean;
    storageForm: FormGroup;

    LANG: LanguageI18NStaticTypes;
    CONFIG: IConfig;

    storageFormValueSubscription: Subscription;

    addStorage: Process;
    url: string;
    alreadyUsed: string;
    alreadyCheckedAndExists = false;
    urlChecked = false;
    passwordChecked = false;
    loginPasswordWrong = false;

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

    validateUrl = (control: FormControl): { [key: string]: any; } => {
        const systemNetworkStorage = control.value?.substr(1);
        const smbStorage = `smb:${control.value}`;
        const alreadyExistingUrl = this.storageManager.storageState.locations.find(({ url }) => url === systemNetworkStorage || url === smbStorage);
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
            login    : new FormControl(),
            password : new FormControl()
        });

        this.storageFormValueSubscription = this.storageForm.valueChanges.subscribe(values => {
            this.urlChecked = false;
            this.url = values.url;
            this.checkUrlValidity();
            this.passwordChecked = this.loginPasswordWrong = false;
        });

        const options = {
            classname : this.CONFIG.toast.danger,
            autohide  : true,
            delay     : this.CONFIG.alertTimeout
        };
        this.addStorage = this.processService
            .createProcess(async() => {
                const { url, login, password } = this.storageForm.value;
                const systemStorages = (await this.storageManager.getStoragesInfo().toPromise()) || [];
                const storageExistsOnSystem = !this.alreadyCheckedAndExists && systemStorages.find(
                    (s) => s.url.replace('smb:', '').split('@').reverse()[0] === url.replace('//', '')
                );
                if (storageExistsOnSystem) {
                    return Promise.reject(Error('alreadyExists'));
                }
                const id = await this.addStorageProcess(url, login, password);
                return id;
            }, { ignoreError: true },
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
                    this.alreadyCheckedAndExists = true;
                } else if (err?.message === 'WrongAuth') {
                    this.passwordChecked = true;
                    this.loginPasswordWrong = true;
                } else {
                    let message = this.LANG.storage.failed();
                    if (['SystemOffline', 'Timeout has occurred'].includes(err?.message)) {
                        message = this.LANG.storage.serverOffline();
                    } else if (err?.message === 'WrongPath') {
                        message = this.LANG.storage.invalidPath();
                    }
                    this.storageForm.reset();
                    this.activeModal.close();
                    this.toastService.show(message, options);
                }
            }
            );
    }

    async addStorageProcess(url: string, login: string, password: string) {
        if (this.loginPasswordWrong) {
            return Promise.reject(Error('WrongAuth'));
        }
        try {
            const credentials = login || password ? `${encodeURIComponent(login)}:${encodeURIComponent(password)}@` : '';
            const smbShare = `smb://${credentials}${url.substr(2)}`;
            const { reply } = await this.storageManager.getStorageStatus({ path: smbShare }).toPromise();
            if (!reply) {
                return Promise.reject(Error('SystemOffline'));
            }

            if (reply.status === 'InitFailed_WrongPath') {
                return Promise.reject(Error('WrongPath'));
            }
            // miscellaneous errors from getStorageStatus
            if (reply.status === 'CreateFailed') {
                return Promise.reject(Error(reply.status));
            }
            if (reply.status === 'InitFailed_WrongAuth') {
                return Promise.reject(Error('WrongAuth'));
            }
            if (reply.status.toLowerCase() === this.CONFIG.responseOk && reply.storage.isWritable) {
                const id = await this.storageManager.saveStorage({
                    parentId       : this.serverId,
                    url            : smbShare,
                    storageType    : 'smb',
                    usedForWriting : true,
                    isWritable     : true,
                    isBackup       : false
                }).toPromise();
                return id ? new Promise(resolve => {
                    this.cancelPolls();
                    this.storageManager.update().pipe(skip(1), take(1)).subscribe(_ => {
                        setTimeout(() => {
                            resolve(id);
                        }, 5000);
                    });
                }) : Promise.reject();
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
        this.passwordChecked = true;
    }

    goBack() {
        this.alreadyCheckedAndExists = false;
    }

    close = () => {
        this.storageForm.reset();
        this.activeModal.close();
    }
}
