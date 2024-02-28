import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { CommonModule } from '@angular/common';
import { AfterViewInit, Component, ElementRef, Inject } from '@angular/core';
import {
    Validators,
    ValidationErrors,
    FormControl,
    FormGroup,
    AbstractControl,
    FormsModule,
    ReactiveFormsModule,
} from '@angular/forms';
import { UntilDestroy } from '@ngneat/until-destroy';
import { TranslateModule } from '@ngx-translate/core';
import { last } from 'lodash-es';
import { firstValueFrom, Subscription } from 'rxjs';
import { filter } from 'rxjs/operators';

import { NxProcessButtonComponent } from '@components/process-button/process-button.component';
import { NxProcessCancelButtonComponent } from '@components/process-cancel-Button/process-cancel-button.component';
import { ToastType } from '@components/toast-container/toast.types';
import type { AddStorage as DT } from '@dialogs/dialogs.types';
import { ModalBase } from '@dialogs/modal-base';
import staticLang from '@language_static';
import { Translatable } from '@pipes/nx-translate.types';
import { PipesModule } from '@pipes/pipes.module';
import { NxProcessService } from '@services/process.service';
import { Process } from '@services/process.service/process';
import { StorageManager } from '@services/system.service/storage-manager/storage-manager';
import { NxToastService } from '@services/toast.service';
import { responseOk } from '@static-variables';
import { cleanIdLegacy, assignFrom } from '@utils/general';

@UntilDestroy({ checkProperties: true })
@Component({
    selector: 'nx-modal-add-storage',
    templateUrl: 'add-storage.component.html',
    styleUrls: ['add-storage.component.scss'],
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        ReactiveFormsModule,
        TranslateModule,
        PipesModule,

        NxProcessButtonComponent,
        NxProcessCancelButtonComponent,
    ],
})
export class AddStorageModalContent extends ModalBase<DT['return']> implements AfterViewInit {
    LANG = staticLang;

    serverId: string;
    storageManager: StorageManager;
    storageForm: FormGroup<{
        url: FormControl<string>;
        login: FormControl<string>;
        password: FormControl<string>;
    }>;
    cancelPolls: () => void;
    storageFormValueSubscription: Subscription;

    addStorage: Process;
    url: string;
    alreadyUsed: Translatable;
    alreadyCheckedAndExists = false;
    urlChecked = false;
    passwordChecked = false;
    loginPasswordWrong = false;

    constructor(
        private processService: NxProcessService,
        private toastService: NxToastService,
        private self: ElementRef<HTMLElement>,
        dialogRef: DialogRef<DT['return']>,
        @Inject(DIALOG_DATA) private dialogData: DT['data'],
    ) {
        super(dialogRef);
    }

    checkUrlValidity(): void {
        const urlC = this.getControls('url');
        if (
            urlC.touched &&
            urlC.errors &&
            !urlC.errors.required &&
            (urlC.errors.alreadyExists || urlC.errors.forbiddenUrl || urlC.errors.wrongPath)
        ) {
            this.urlChecked = true; // shows error border around input
        }
    }

    private validateUrl = (control: FormControl<string>): ValidationErrors | null => {
        const systemNetworkStorage = control.value?.substr(1);
        const smbStorage = `smb:${control.value}`;
        const alreadyExistingUrl = this.storageManager.storageState.locations.find(
            ({ url }) => url === systemNetworkStorage || url === smbStorage,
        );
        if (alreadyExistingUrl) {
            return { alreadyExists: true };
        }
        const ipReg = new RegExp(/^(\/\/)(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})\/.+/);
        const domainReg = new RegExp(/^(\/\/).+\/.+/);
        const forbidden = !ipReg.test(control.value) && !domainReg.test(control.value);
        return forbidden ? { forbiddenUrl: true } : null;
    };

    ngOnInit(): void {
        assignFrom(this.dialogData, ['serverId', 'storageManager', 'cancelPolls'], this);

        this.storageForm = new FormGroup({
            url: new FormControl<string>(null, [Validators.required, this.validateUrl.bind(this)]),
            login: new FormControl<string>(null),
            password: new FormControl<string>(null),
        });

        this.storageFormValueSubscription = this.storageForm.valueChanges.subscribe(values => {
            this.urlChecked = false;
            this.url = values.url;
            this.checkUrlValidity();
            this.loginPasswordWrong = false;
            this.passwordChecked = false;
        });

        this.addStorage = this.processService.createProcess(
            async () => {
                this.lock();
                const { url, login, password } = this.storageForm.value;
                const systemStorages =
                    (await firstValueFrom(this.storageManager.getStoragesInfo())) || [];
                const storageExistsOnSystem =
                    !this.alreadyCheckedAndExists &&
                    systemStorages.find(
                        s =>
                            last(s.url.replace('smb:', '').replace('//', '').split('@')) ===
                            url.replace('//', ''),
                    );
                if (storageExistsOnSystem) {
                    return Promise.reject(Error('alreadyExists'));
                }
                const id = await this.addStorageProcess(url, login, password);
                return id;
            },
            { ignoreError: true },
            res => {
                if (res.id) {
                    this.toastService.notify(this.LANG.storage.success, ToastType.Success);
                } else {
                    this.toastService.notify(this.LANG.storage.failed, ToastType.Danger);
                }
                this.storageForm.reset();
                this.close();
            },
            err => {
                if (err?.message === 'alreadyExists') {
                    this.alreadyUsed = {
                        value: this.LANG.storage.alreadyUsed,
                        params: {
                            url: this.url,
                        },
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
                        this.toastService.notify(message, ToastType.Danger);
                    }
                    this.addStorage.processing = false;
                }
                this.unlock();
            },
        );
    }

    ngAfterViewInit(): void {
        setTimeout(() => {
            this.self.nativeElement.querySelector('input')?.focus();
        });
    }

    async addStorageProcess(url: string, login: string, password: string): Promise<{ id: string }> {
        if (this.loginPasswordWrong) {
            return Promise.reject(Error('WrongAuth'));
        }
        try {
            const credentials =
                login || password
                    ? `${encodeURIComponent(login)}:${encodeURIComponent(password)}@`
                    : '';
            const smbShare = `smb://${credentials}${url.substr(2)}`;
            const { reply } = await firstValueFrom(
                this.storageManager.getStorageStatus({ path: smbShare }),
            );

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
            if (reply.status.toLowerCase() === responseOk && reply.storage.isWritable) {
                const size = reply.storage.totalSpace;
                const upperBound = 107374182400; // 100GB
                const lowerBound = upperBound / 2; // 50GB
                const res = await firstValueFrom(
                    this.storageManager.saveStorage({
                        parentId: this.serverId,
                        url: smbShare,
                        storageType: 'smb',
                        spaceLimit: Math.min(
                            Math.max(Math.round(size / 10), lowerBound),
                            upperBound,
                            size,
                        ),
                        usedForWriting: true,
                        isWritable: true,
                        isBackup: false,
                    }),
                );
                return res
                    ? new Promise(resolve => {
                          this.cancelPolls();
                          const updateSubscription = this.storageManager
                              .update()
                              .pipe(
                                  filter(
                                      state =>
                                          !!state.locations.find(
                                              ({ storageId }) =>
                                                  storageId === cleanIdLegacy(res.id),
                                          ),
                                  ),
                              )
                              .subscribe(_ => {
                                  setTimeout(() => {
                                      resolve(res);
                                      updateSubscription.unsubscribe();
                                  }, 5000);
                              });
                      })
                    : Promise.reject();
            }
            return Promise.reject();
        } catch (error) {
            return Promise.reject(error);
        }
    }

    getControls(field: string): AbstractControl<unknown, unknown> {
        return this.storageForm.get(field);
    }

    preSubmit = (): void => {
        this.urlChecked = true;
        this.passwordChecked = true;
    };

    goBack(): void {
        this.alreadyCheckedAndExists = false;
    }

    override close = (): void => {
        this.storageForm.reset();
        this.dialogRef.close();
    };
}
