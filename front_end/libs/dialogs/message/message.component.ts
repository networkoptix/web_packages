import { DialogRef, DIALOG_DATA } from '@angular/cdk/dialog';
import { CommonModule } from '@angular/common';
import { Component, Inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslateService, TranslateModule } from '@ngx-translate/core';

import type { DropdownItem } from '@components/dropdowns/generic/dropdown.component.types';
import { NxGenericDropdownModule } from '@components/dropdowns/generic/dropdown.module';
import { NxProcessButtonComponent } from '@components/process-button/process-button.component';
import { NxProcessCancelButtonComponent } from '@components/process-cancel-Button/process-cancel-button.component';
import type { Message as DT } from '@dialogs/dialogs.types';
import { ModalBase } from '@dialogs/modal-base';
import { NxFocusMeDirective } from '@directives/nx-focus-me';
import staticLang from '@language_static';
import { Translatable } from '@pipes/nx-translate.types';
import { PipesModule } from '@pipes/pipes.module';
import { NxAccountService } from '@services/account.service';
import { NxCloudApiService } from '@services/nx-cloud-api';
import { NxProcessService } from '@services/process.service';
import { Process } from '@services/process.service/process';
import { WINDOW } from '@services/window-provider';
import { credentialsValidation, dialogs } from '@static-variables';
import { assignFrom } from '@utils/general';

type Subject = DropdownItem<string>;

@Component({
    selector: 'nx-modal-message-content',
    templateUrl: 'message.component.html',
    styleUrls: [],
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        TranslateModule,

        PipesModule,
        NxGenericDropdownModule,
        NxProcessButtonComponent,
        NxProcessCancelButtonComponent,
        NxFocusMeDirective,
    ],
})
export class MessageModalContent extends ModalBase<DT['return']> implements OnInit {
    LANG = staticLang;

    messageType: string;
    data: DT['data']['data'];
    placeholder: string;
    sendMessage: Process;
    userName: string;
    userEmail: string;
    message: string;
    title: Translatable;
    private subject: string;
    subjectMessage: string;
    subjects: Subject[];
    url: string;
    credentialsValidation = credentialsValidation;

    constructor(
        private translateService: TranslateService,
        private processService: NxProcessService,
        private account: NxAccountService,
        private cloudApiService: NxCloudApiService,
        public dialogRef: DialogRef<DT['return']>,
        @Inject(DIALOG_DATA) private dialogData: DT['data'],
        @Inject(WINDOW) private window: Window,
    ) {
        super(dialogRef);
        this.placeholder = '';
        this.subject = '';
        this.subjectMessage = '';
        this.url = this.window.location.href;
    }

    ngOnInit(): void {
        assignFrom(this.dialogData, ['messageType', 'data'], this);

        this.initForm();
        this.sendMessage = this.processService
            .createProcess(
                () => {
                    this.lock();
                    const asset = this.data.assetId || this.data.asset;

                    return this.cloudApiService.sendMessage(
                        this.subject,
                        asset,
                        this.message,
                        this.userName,
                        this.userEmail,
                    );
                },
                {
                    successMessage: this.LANG.dialogs.message.sent,
                },
            )
            .then(
                () => {
                    this.close(true);
                },
                () => {
                    this.unlock();
                },
            );
    }

    private initForm(): void {
        this.placeholder = '';
        if (this.messageType === dialogs.message.type.ipvd_page) {
            this.placeholder = this.LANG.dialogs.message.placeholders.feedback;
        }

        this.title = {
            value: this.LANG.dialogs.message.title[this.messageType],
            params:
                this.messageType !== dialogs.message.type.integration
                    ? { asset: this.data.asset }
                    : { companyName: this.data.to },
        };

        const type = this.messageType as keyof typeof dialogs.message.subjects;
        this.subjects = dialogs.message.subjects[type].map(subject => {
            return {
                value: subject,
                name: this.translateService.instant(this.LANG.dialogs.message.subject[subject], {
                    asset: this.data.asset,
                }),
            };
        });

        this.setSubject(this.subjects[0]);

        this.account.get().then(account => {
            if (account.is_authenticated) {
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
