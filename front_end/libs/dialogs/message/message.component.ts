import {
    Component,
    Inject,
    Input,
    OnInit,
    ViewChild
} from '@angular/core';
import { NgForm } from '@angular/forms';
import { TranslateService } from '@ngx-translate/core';

import staticLang from '@common/language/language_i18n_static.json';
import type {
    DropdownItem
} from '@components/dropdowns/generic/dropdown.component.types';
import { DIALOG_DATA, DialogRef } from '@dialogs/dialog-ref';
import { Translatable } from '@pipes/any-translate.types';
import { NxAccountService } from '@services/account.service';
import type { IConfig } from '@services/nx-config/config-types';
import { NxConfigService } from '@services/nx-config/nx-config.service';
import { NxProcessService } from '@services/process.service';
import { Process } from '@services/process.service/process';
import { WINDOW } from '@services/window-provider';
import { pickFrom } from '@utils/general';

type Subject = DropdownItem<string>;

@Component({
    selector: 'nx-modal-message-content',
    templateUrl: 'message.component.html',
    styleUrls: []
})
export class MessageModalContent implements OnInit {
    @Input() closable = true;

    CONFIG: IConfig;
    LANG = staticLang;

    account: NxAccountService;
    messageType: string;
    data: any;
    placeholder: string;
    sendMessage: Process;
    userName: string;
    userEmail: string;
    message: string;
    agree: boolean;
    title: Translatable;
    subject: string;
    subjectMessage: string;
    subjects: Subject[];
    url: string;

    @ViewChild('feedbackForm', { static: true }) public feedbackForm: NgForm;

    constructor(
        configService: NxConfigService,
        private translateService: TranslateService,
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
    }

    ngOnInit(): void {
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
            successMessage: this.LANG.dialogs.message.sent
        }).then(() => {
            this.close(true);
        });
    }

    close = (msg: string | boolean = false): void => {
        this.dialogRef.close(msg);
    };

    initForm(): void {
        this.placeholder = '';
        if (this.messageType === this.CONFIG.dialogs.message.type.ipvd_page) {
            this.placeholder = this.LANG.dialogs.message.placeholders.feedback;
        }

        this.title = {
            value: this.LANG.dialogs.message.title[this.messageType],
            params: this.messageType !== this.CONFIG.dialogs.message.type.integration
                ? { asset: this.data.asset }
                : { companyName: this.data.to }
        };

        this.subjects = this.CONFIG.dialogs.message.subjects[this.messageType]
            .map(subject => {
                return {
                    value: subject,
                    name: this.translateService.instant(
                        this.LANG.dialogs.message.subject[subject],
                        {
                            asset: this.data.asset
                        })
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

    setSubject(subject: Subject): void {
        this.subject = subject.value;
        this.subjectMessage = subject.name;
    }
}
