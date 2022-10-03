import { Component, Input } from '@angular/core';
import {
    FormGroup,
    FormControl,
    Validators
} from '@angular/forms';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { UntilDestroy } from '@ngneat/until-destroy';
import { Subscription } from 'rxjs';
import { filter } from 'rxjs/operators';

import { LanguageI18NStaticTypes } from '@app/language_i18n_static_types';
import { NxConfigService, IConfig } from '@services/nx-config';
import { NxLanguageProviderService } from '@services/nx-language-provider';
import { NxProcessService, Process } from '@services/process.service';
import {
    StorageManager
} from '@services/system.service/system/storage-manager/storage-manager';
import { NxUtilsService } from '@services/utils.service';

import { NxToastService } from '../toast.service';

@UntilDestroy({ checkProperties: true })
@Component({
    selector: 'nx-modal-add-storage',
    templateUrl: 'add-storage.component.html',
    styleUrls: ['add-storage.component.scss']
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
            urlC.touched &&
            urlC.errors &&
            !urlC.errors.required &&
            (
                urlC.errors.alreadyExists ||
                urlC.errors.forbiddenUrl ||
                urlC.errors.wrongPath
            )
        ) {
            this.urlChecked = true; // shows error border around input
        }
    }

    validateUrl = (control: FormControl): { [key: string]: any; } => {
        const systemNetworkStorage = control.value?.substr(1);
        const smbStorage = `smb:${control.value}`;
        const alreadyExistingUrl = this.storageManager.storageState.locations
            .find(({ url }) =>
                url === systemNetworkStorage || url === smbStorage
            );
        if (alreadyExistingUrl) {
            return { alreadyExists: true };
        }
        const ipReg =
            new RegExp(/^(\/\/)(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})\/.+/);
        const domainReg = new RegExp(/^(\/\/).+\/.+/);
        const forbidden =
            !ipReg.test(control.value) && !domainReg.test(control.value);
        return forbidden ? { forbiddenUrl: true } : null;
    }

    ngOnInit() {
        this.storageForm = new FormGroup({
            url: new FormControl(
                null,
                [Validators.required, this.validateUrl.bind(this)]
            ),
            login: new FormControl(),
            password: new FormControl()
        });

        this.storageFormValueSubscription =
            this.storageForm.valueChanges.subscribe(values => {
                this.urlChecked = false;
                this.url = values.url;
                this.checkUrlValidity();
                this.loginPasswordWrong = false;
                this.passwordChecked = false;
            });

        const options = {
            classname: this.CONFIG.toast.danger,
            autohide: true,
            delay: this.CONFIG.alertTimeout
        };
        this.addStorage = this.processService
            .createProcess(async() => {
                const { url, login, password } = this.storageForm.value;
                const systemStorages = (
                    await this.storageManager.getStoragesInfo().toPromise()
                ) || [];
                const storageExistsOnSystem = !this.alreadyCheckedAndExists &&
                    systemStorages.find(
                        (s) => s.url.replace('smb:', '')
                            .replace('//', '')
                            .split('@')
                            .reverse()[0] === url.replace('//', '')
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
                    this.alreadyUsed = NxLanguageProviderService.translate(
                        this.LANG.storage.alreadyUsed,
                        { url: this.url }
                    );
                    this.alreadyCheckedAndExists = true;
                } else if (err?.message === 'WrongAuth') {
                    this.passwordChecked = true;
                    this.loginPasswordWrong = true;
                } else {
                    let message;
                    if (err?.message === 'WrongPath') {
                        this.getControls('url').setErrors({ wrongPath: true });
                    } else {
                        message = this.LANG.storage.serverOffline();
                        this.storageForm.reset();
                    }
                    if (message) {
                        this.toastService.show(message, options);
                    }
                    this.addStorage.processing = false;
                }
            }
            );
    }

    async addStorageProcess(url: string, login: string, password: string) {
        if (this.loginPasswordWrong) {
            return Promise.reject(Error('WrongAuth'));
        }
        try {
            const credentials = login || password
                ? `${encodeURIComponent(login)}:${encodeURIComponent(password)}@`
                : '';
            const smbShare = `smb://${credentials}${url.substr(2)}`;
            const { reply } = await this.storageManager
                .getStorageStatus({ path: smbShare })
                .toPromise();

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
            if (
                reply.status.toLowerCase() ===
                this.CONFIG.responseOk && reply.storage.isWritable
            ) {
                const size = reply.storage.totalSpace;
                const upperBound = 107374182400; // 100GB
                const lowerBound = upperBound / 2; // 50GB
                const res = await this.storageManager.saveStorage({
                    parentId: this.serverId,
                    url: smbShare,
                    storageType: 'smb',
                    spaceLimit: Math.min(
                        Math.max(Math.round(size / 10), lowerBound),
                        upperBound,
                        size
                    ),
                    usedForWriting: true,
                    isWritable: true,
                    isBackup: false
                }).toPromise();
                return res ? new Promise(resolve => {
                    this.cancelPolls();
                    const updateSubscription = this.storageManager.update().pipe(
                        filter((state: any) => state.locations.find(({
                            storageId
                        }) => storageId === NxUtilsService.cleanId(res.id)))
                    ).subscribe(_ => {
                        setTimeout(() => {
                            resolve(res);
                            updateSubscription.unsubscribe();
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
