import { Component, Inject, Input } from '@angular/core';
import {
    FormGroup,
    FormControl,
    Validators
} from '@angular/forms';
import { UntilDestroy } from '@ngneat/until-destroy';
import { last } from 'lodash-es';
import { Subscription } from 'rxjs';
import { filter } from 'rxjs/operators';

import { LanguageI18NStaticTypes } from '@app/language_i18n_static_types';
import { DIALOG_DATA, DialogRef } from '@dialogs/dialog-ref';
import type { IConfig } from '@services/nx-config/config-types';
import { NxConfigService } from '@services/nx-config/nx-config.service';
import { NxLanguageProviderService } from '@services/nx-language-provider';
import { NxProcessService, Process } from '@services/process.service';
import {
    StorageManager
} from '@services/system.service/storage-manager/storage-manager';
import { cleanId, pickFrom } from '@utils/general';

import { NxToastService } from '../toast.service';

@UntilDestroy({ checkProperties: true })
@Component({
    selector: 'nx-modal-add-storage',
    templateUrl: 'add-storage.component.html',
    styleUrls: ['add-storage.component.scss']
})
export class AddStorageModalContent {
    @Input() closable: boolean = true;

    LANG: LanguageI18NStaticTypes;
    CONFIG: IConfig;

    serverId: string;
    storageManager: StorageManager;
    storageForm: FormGroup;
    cancelPolls: () => any;
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
        private processService: NxProcessService,
        private toastService: NxToastService,
        private dialogRef: DialogRef,
        @Inject(DIALOG_DATA) private dialogData: any,
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
    };

    ngOnInit() {
        pickFrom(this.dialogData, ['serverId', 'storageManager', 'cancelPolls'], this);

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
            .createProcess(async () => {
                const { url, login, password } = this.storageForm.value;
                const systemStorages = (
                    await this.storageManager.getStoragesInfo().toPromise()
                ) || [];
                const storageExistsOnSystem = !this.alreadyCheckedAndExists &&
                    systemStorages.find(
                        s => last(
                            s.url.replace('smb:', '').replace('//', '').split('@')
                        ) === url.replace('//', '')
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
                this.close(res.id && this.CONFIG.responseOk);
                this.toastService.show(message, options);
            },
            err => {
                if (err?.message === 'alreadyExists') {
                    this.alreadyUsed = this.LANG.storage.alreadyUsed({
                        url: this.url
                    });
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
                        }) => storageId === cleanId(res.id)))
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
    };

    goBack() {
        this.alreadyCheckedAndExists = false;
    }

    close = (msg?: string) => {
        this.storageForm.reset();
        this.dialogRef.close(msg);
    };
}
