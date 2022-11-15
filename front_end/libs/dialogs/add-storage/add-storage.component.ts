import { Component, Inject, Input } from '@angular/core';
import {
    UntypedFormGroup,
    UntypedFormControl,
    Validators
} from '@angular/forms';
import { UntilDestroy } from '@ngneat/until-destroy';
import { last } from 'lodash-es';
import { Subscription } from 'rxjs';
import { filter } from 'rxjs/operators';

import staticLang from '@common/language/language_i18n_static.json';
import { DIALOG_DATA, DialogRef } from '@dialogs/dialog-ref';
import { Translatable } from '@pipes/any-translate.types';
import type { IConfig } from '@services/nx-config/config-types';
import { NxConfigService } from '@services/nx-config/nx-config.service';
import { NxProcessService } from '@services/process.service';
import { Process } from '@services/process.service/process';
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

    LANG = staticLang;
    CONFIG: IConfig;

    serverId: string;
    storageManager: StorageManager;
    storageForm: UntypedFormGroup;
    cancelPolls: () => any;
    storageFormValueSubscription: Subscription;

    addStorage: Process;
    url: string;
    alreadyUsed: Translatable;
    alreadyCheckedAndExists = false;
    urlChecked = false;
    passwordChecked = false;
    loginPasswordWrong = false;

    constructor(
        configService: NxConfigService,
        private processService: NxProcessService,
        private toastService: NxToastService,
        private dialogRef: DialogRef,
        @Inject(DIALOG_DATA) private dialogData: any,
    ) {
        this.CONFIG = configService.getConfig();
    }

    checkUrlValidity(): void {
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

    validateUrl = (control: UntypedFormControl): { [key: string]: any; } => {
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

    ngOnInit(): void {
        pickFrom(this.dialogData, ['serverId', 'storageManager', 'cancelPolls'], this);

        this.storageForm = new UntypedFormGroup({
            url: new UntypedFormControl(
                null,
                [Validators.required, this.validateUrl.bind(this)]
            ),
            login: new UntypedFormControl(),
            password: new UntypedFormControl()
        });

        this.storageFormValueSubscription =
            this.storageForm.valueChanges.subscribe(values => {
                this.urlChecked = false;
                this.url = values.url;
                this.checkUrlValidity();
                this.loginPasswordWrong = false;
                this.passwordChecked = false;
            });

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
                let toastType = this.CONFIG.toast.danger;
                let message = this.LANG.storage.failed;
                if (res.id) {
                    toastType = this.CONFIG.toast.success;
                    message = this.LANG.storage.success;
                }
                this.storageForm.reset();
                this.close(res.id && this.CONFIG.responseOk);
                this.toastService.notify(message, toastType);
            },
            err => {
                if (err?.message === 'alreadyExists') {
                    this.alreadyUsed = {
                        value: this.LANG.storage.alreadyUsed,
                        params: {
                            url: this.url
                        }
                    };
                    this.alreadyCheckedAndExists = true;
                } else if (err?.message === 'WrongAuth') {
                    this.passwordChecked = true;
                    this.loginPasswordWrong = true;
                } else {
                    let message: string;
                    if (err?.message === 'WrongPath') {
                        this.getControls('url').setErrors({ wrongPath: true });
                    } else {
                        message = this.LANG.storage.serverOffline;
                        this.storageForm.reset();
                    }
                    if (message) {
                        this.toastService.notify(
                            message,
                            this.CONFIG.toast.danger
                        );
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

    preSubmit = (): void => {
        this.urlChecked = true;
        this.passwordChecked = true;
    };

    goBack(): void {
        this.alreadyCheckedAndExists = false;
    }

    close = (msg?: string): void => {
        this.storageForm.reset();
        this.dialogRef.close(msg);
    };
}
