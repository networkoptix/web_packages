import { Component, Input }            from '@angular/core';
import {
    FormGroup, FormControl, Validators
}                                      from '@angular/forms';
import { NgbActiveModal }              from '@ng-bootstrap/ng-bootstrap';

import { NxConfigService, IConfig }  from '../../services/nx-config';
import { NxLanguageProviderService } from '../../services/nx-language-provider';
import { NxProcessService, Process } from '../../services/process.service';
import { NxSystem }                  from '../../services/system.service';
import { NxRibbonService }             from '../../components/ribbon/ribbon.service';
import { LanguageI18NStaticTypes }     from '../../../language_i18n_static_types';

@Component({
    selector    : 'nx-modal-add-storage',
    templateUrl : 'add-storage.component.html',
    styleUrls   : []
})
export class AddStorageModalContent {
    @Input() system: NxSystem;
    @Input() serverId: string;
    @Input() closable: boolean;
    // @ViewChild('addStorageForm') form;
    storageForm: FormGroup;

    LANG: LanguageI18NStaticTypes;
    // CONFIG: IConfig;

    addStorage: Process;
    storage: any;
    wrongPassword: any;
    url: string;
    alreadyExists = false;
    urlChecked = false;
    loginChecked = false;
    passwordChecked = false;

    constructor(
        configService: NxConfigService,
        language: NxLanguageProviderService,
        public activeModal: NgbActiveModal,
        private processService: NxProcessService,
        private ribbonService: NxRibbonService
    ) {
        // this.CONFIG = configService.getConfig();
        this.LANG = language.translations;
    }

    checkUrlValidity() {
        const urlC = this.getControls('url');
        if (urlC.touched && urlC.errors.forbiddenUrl && !urlC.errors.required) {
            console.log('urlChecked set to true');
            this.urlChecked = true;
        }
    }

    ngOnInit() {
        this.storage = {
            username : '',
            password : '',
            url      : ''
        };

        this.wrongPassword = '';

        this.addStorage = this.processService
            .createProcess(() => {
                const { url, login, password } = this.storageForm.value;
                // const storageExistsOnServer: boolean = this.systems.storages;
                // if (storageExistsOnServer) {
                //     this.storageForm.controls.url.setErrors({ alreadyExists: true });
                //     return Promise.resolve('alreadyExists');
                // } else {
                //     // endpoint to add storage
                //     return this.system.addStorage(url, login, password);
                // }
                const smbShare = `smb://${login}:${password}@${url.substr(2)}`;
                return this.system.getStorageStatus({ path: smbShare }).toPromise()
                    .then((res) => {
                        if (res.reply.status.toLowerCase() === this.CONFIG.responseOk && res.reply.storage.isWritable) {
                            this.system.saveStorage({ parentId: this.serverId, url: smbShare }).toPromise()
                                .then(response => {
                                    if (response.id) {
                                        this.activeModal.close(this.CONFIG.responseOk);
                                    }
                                }, (error) => console.error(error))
                                .then((res) => {
                                    return Promise.resolve(res);
                                });
                        }
                        if (res.reply.status === 'InitFailed_WrongAuth') {
                            // eslint-disable-next-line prefer-promise-reject-errors
                            return Promise.reject({ error: { resultCode: 'WrongAuth' } });
                        }
                    });
                // return this.system.getStorageStatus({ path: 'smb://user:password@host/path/to/folder' });
            }, { ignoreError: true })
            .then((response) => {
                if (response) {
                    this.activeModal.close();
                }
                // else if (res) {
                //     this.ribbonService.show(this.LANG.ribbon.systemOffline, [], 'alert');
                //     this.storageForm.reset();
                //     this.activeModal.close();
                // }
            });
        this.storageForm = new FormGroup({
            url      : new FormControl(null, [Validators.required]),
            login    : new FormControl(null, [Validators.required]),
            password : new FormControl(null, [Validators.required])
        });

        this.storageForm.valueChanges.subscribe(values => {
            for (const field in values) {
                if (values[field]) {
                    this[`${field}Checked`] = false;
                    if (field === 'url') {
                        this.url = values[field];
                        this.checkUrlValidity();
                    }
                }
            }
        });

        console.log('ngOnInit in dialog called');
        // this.addStorage = this.processService.createProcess(() => {
        //     console.log('process createProcess returns');
        //     const { url, login, password } = this.storageForm.value;
        //     return Promise.resolve('alreadyExists');
        // })
        //     .then(res => {
        //         console.log('res from addStorage process', res);
        //         if (res === 'alreadyExists') {
        //             this.alreadyExists = true;
        //         }
        //         // else if (res) {
        //         //     this.ribbonService.show(this.LANG.ribbon.systemOffline, [], 'alert');
        //         //     this.storageForm.reset();
        //         //     this.activeModal.close();
        //         // }
        //     });
    }

    getControls(field: string) {
        return this.storageForm.get(field);
    }

    preSubmit() {
        console.log('presubmit called?');
        this.urlChecked = true;
        this.loginChecked = true;
        this.passwordChecked = true;
    }

    goBack() {
        this.alreadyExists = false;
    }

    close() {
        this.storageForm.reset();
        this.activeModal.close();
    }

    onSubmit() {
        // this.getControls('url').markAsUntouched();
    }

    getControls(field: string) {
        return this.storageForm.get(field);
    }

    preSubmit() {
        console.log('presubmit called?');
        this.urlChecked = true;
        this.loginChecked = true;
        this.passwordChecked = true;
    }

    goBack() {
        this.alreadyExists = false;
    }

    close() {
        this.storageForm.reset();
        this.activeModal.close();
    }

    onSubmit() {
        // this.getControls('url').markAsUntouched();
    }
}
