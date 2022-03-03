import {
    Component,
    Inject,
    Input,
    OnInit,
    ViewChild
} from '@angular/core';
import { NgForm } from '@angular/forms';

import { LanguageI18NStaticTypes } from '@app/language_i18n_static_types';
import { DIALOG_DATA, DialogRef } from '@dialogs/dialog-ref';
import { NxAccountService } from '@services/account.service';
import type { IConfig } from '@services/nx-config/config-types';
import { NxConfigService } from '@services/nx-config/nx-config.service';
import { NxLanguageProviderService } from '@services/nx-language-provider';
import { NxProcessService, Process } from '@services/process.service';
import { WINDOW } from '@services/window-provider';
import { pickFrom } from '@utils/general';

export interface MessageParams {
    disclaimer: string;
    email?: string;
    asset: string;
    assetId?: string;
    to?: string;
}

interface Subject {
    id: string;
    name: string;
}

@Component({
    selector: 'nx-modal-message-content',
    templateUrl: 'message.component.html',
    styleUrls: []
})
export class MessageModalContent implements OnInit {
    @Input() closable = true;

    LANG: LanguageI18NStaticTypes;
    CONFIG: IConfig;

    account: NxAccountService;
    messageType: string;
    data: any;
    placeholder: string;
    sendMessage: Process;
    userName: string;
    userEmail: string;
    message: string;
    agree: boolean;
    title: string;
    subject: string;
    subjectMessage: string;
    subjects: Subject[];
    url: string;

    @ViewChild('feedbackForm', { static: true }) public feedbackForm: NgForm;

    constructor(
        configService: NxConfigService,
        languageService: NxLanguageProviderService,
        private processService: NxProcessService,
        private dialogRef: DialogRef,
        @Inject(DIALOG_DATA) private dialogData: any,
        @Inject(WINDOW) private window: Window,
    ) {
        this.placeholder = '';
        this.subject = '';
        this.subjectMessage = '';
        this.url = this.window.location.href;
        this.CONFIG = configService.getConfig();
        this.LANG = languageService.translations;
    }

    ngOnInit() {
        pickFrom(this.dialogData, ['account', 'messageType', 'data'], this);

        this.initForm();
        this.sendMessage = this.processService.createProcess(() => {
            const asset = this.data.assetId || this.data.asset;

            return this.account.sendMessage(
                this.subject,
                asset,
                this.message,
                this.userName,
                this.userEmail
            );
        }, {
            successMessage: this.LANG.dialogs.message.sent?.()
        }).then(() => {
            this.close(true);
        });
    }

    close = (msg: string | boolean = false) => {
        this.dialogRef.close(msg);
    };

    initForm() {
        this.placeholder = '';
        if (this.messageType === this.CONFIG.dialogs.message.type.ipvd_page) {
            this.placeholder = this.LANG.dialogs.message.placeholders.feedback?.();
        }

        const title = this.LANG.dialogs.message.title[this.messageType];

        if (this.messageType !== this.CONFIG.dialogs.message.type.integration) {
            this.title = NxLanguageProviderService.translate(
                title,
                { asset: this.data.asset }
            );
        } else {
            this.title = NxLanguageProviderService.translate(
                title,
                { companyName: this.data.to }
            );
        }
        this.subjects = this.CONFIG.dialogs.message.subjects[this.messageType]
            .map(subject => {
                return {
                    value: subject,
                    name: NxLanguageProviderService.translate(
                        this.LANG.dialogs.message.subject[subject],
                        { asset: this.data.asset }
                    )
                };
            });

        this.setSubject(this.subjects[0]);

        this.account
            .get()
            .then(account => {
                if (account) {
                    this.userName = `${account.first_name} ${account.last_name}`;
                    this.userEmail = account.email;
                }
            });
    }

    setSubject(subject: any) {
        this.subject = subject.value;
        this.subjectMessage = subject.name;
    }
}
