import { Component, Input }            from '@angular/core';
import {
    FormGroup, FormControl, Validators
}                                      from '@angular/forms';
import { NgbActiveModal }              from '@ng-bootstrap/ng-bootstrap';
import { UntilDestroy }                from '@ngneat/until-destroy';
import { of, Subscription }            from 'rxjs';
import { switchMap }                   from 'rxjs/operators';

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
    @Input() closable: boolean;
    @Input() updateStorage: () => Promise<any>;
    storageForm: FormGroup;

    LANG: LanguageI18NStaticTypes;
    CONFIG: IConfig;

    storageFormValueSubscription: Subscription;

    addStorage: Process;
    url: string;
    alreadyUsed: string;
    alreadyCheckedAndExists = false;
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
        const systemNetworkStorage = control.value?.substr(1);
        const smbStorage = `smb:${control.value}`;
        const alreadyExistingUrl = this.storage.find(({ url }) => url === systemNetworkStorage || url === smbStorage);
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
        });

        const options = {
            classname : this.CONFIG.toast.danger,
            autohide  : true,
            delay     : this.CONFIG.alertTimeout
        };
        this.addStorage = this.processService
            .createProcess(async() => {
                const { url, login, password } = this.storageForm.value;
                const systemStorages = (await this.system.getStorages().toPromise()) || [];
                const storageExistsOnSystem = !this.alreadyCheckedAndExists && systemStorages.find((s) => s.url.replace('smb:', '') === url);
                if (storageExistsOnSystem) {
                    return Promise.reject(Error('alreadyExists'));
                }
                const id = await this.addStorageProcess(url, login, password);
                await this.updateStorage();
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
                    this.loginChecked = true;
                } else {
                    let message = this.LANG.storage.failed();
                    if (['SystemOffline', 'Timeout has occurred'].includes(err?.message)) {
                        this.system.systemInfo = this.system;
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
        try {
            const credentials = login || password ? `${encodeURIComponent(login)}:${encodeURIComponent(password)}@` : '';
            const smbShare = `smb://${credentials}${url.substr(2)}`;
            const { reply } = await this.system.getStorageStatus({ path: smbShare }).toPromise();
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
                return this.system.saveStorage({
                    parentId         : this.serverId,
                    url              : smbShare,
                    storageType      : 'smb',
                    usedForWriting   : true,
                    isWritable       : true,
                    isBackup         : false
                }).toPromise();
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
        this.alreadyCheckedAndExists = false;
    }

    close = () => {
        this.storageForm.reset();
        this.activeModal.close();
    }
}
