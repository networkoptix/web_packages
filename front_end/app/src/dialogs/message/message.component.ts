import {
    Component, Inject, Input, OnInit,
    Renderer2, ViewChild
}                                    from '@angular/core';
import { NgbActiveModal }            from '@ng-bootstrap/ng-bootstrap';
import { NgForm }                    from '@angular/forms';

import { NxLanguageProviderService } from '../../services/nx-language-provider';
import { NxConfigService, IConfig }  from '../../services/nx-config';
import { NxAccountService }          from '../../services/account.service';
import { WINDOW }                    from '../../services/window-provider';
import { NxProcessService, Process } from '../../services/process.service';
import { NxCloudApiService }         from '../../services/nx-cloud-api';
import { LanguageI18NStaticTypes }   from '../../../language_i18n_static_types';

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
    selector    : 'nx-modal-message-content',
    templateUrl : 'message.component.html',
    styleUrls   : []
})
export class MessageModalContent implements OnInit {
    @Input() account: NxAccountService;
    @Input() messageType;
    @Input() data;
    @Input() closable;

    LANG: LanguageI18NStaticTypes;
    CONFIG: IConfig;

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
        public activeModal: NgbActiveModal,
        private renderer: Renderer2,
        private processService: NxProcessService,
        private cloudApiService: NxCloudApiService,
        @Inject(WINDOW) private window: Window
    ) {
        this.placeholder = '';
        this.subject = '';
        this.subjectMessage = '';
        this.url = this.window.location.href;
        this.CONFIG = configService.getConfig();
        this.LANG = languageService.translations;
    }

    ngOnInit() {
        this.initForm();
        this.sendMessage = this.processService.createProcess(() => {
            const asset = this.data.assetId || this.data.asset;

            return this.cloudApiService.sendMessage(this.subject, asset, this.message, this.userName, this.userEmail).toPromise();
        }, {
            successMessage: this.LANG.dialogs.message.sent
        }).then(() => {
            this.activeModal.close(true);
        });
    }

    close() {
        this.activeModal.close();
    }

    initForm() {
        this.placeholder = '';
        if (this.messageType === this.CONFIG.dialogs.message.type.ipvd_page) {
            this.placeholder = this.LANG.dialogs.message.placeholders.feedback;
        }

        const title = this.LANG.dialogs.message.title[this.messageType];
        if (this.messageType !== this.CONFIG.dialogs.message.type.integration) {
            this.title = NxLanguageProviderService.translate(title, { asset: this.data.asset });
        } else {
            this.title = NxLanguageProviderService.translate(title, { companyName: this.data.to });
        }
        this.subjects = this.CONFIG.dialogs.message.subjects[this.messageType].map((subject) => {
            return {
                value : subject,
                name  : this.LANG.dialogs.message.subject[subject].replace('{{asset}}', this.data.asset)
            };
        });

        this.setSubject(this.subjects[0]);

        this.account
            .get()
            .then((account) => {
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
