import { Component, Inject, OnInit, Input, ViewEncapsulation, Renderer2, ViewChild } from '@angular/core';
import { NgbModal, NgbActiveModal, NgbModalRef }                                     from '@ng-bootstrap/ng-bootstrap';
import { EmailValidator, NgForm }                                                    from '@angular/forms';
import { NxConfigService }                                                           from '../../services/nx-config';
import { TranslateService }                                                          from '@ngx-translate/core';

@Component({
    selector: 'nx-modal-message-content',
    templateUrl: 'message.component.html',
    styleUrls: []
})
export class MessageModalContent {
    @Input() messageType;
    @Input() data;
    @Input() closable;
    @Input() config;

    lang: any;
    placeholder: string;
    sendMessage: any;
    userName: string;
    userEmail: string;
    message: string;
    contact: boolean;
    agree: boolean;
    title: string;
    topic: string;
    topicMessage: string;
    topics: any;

    @ViewChild('feedbackForm') public feedbackForm: NgForm;

    constructor(private activeModal: NgbActiveModal,
                private renderer: Renderer2,
                private translation: TranslateService,
                @Inject('account') private account: any,
                @Inject('process') private process: any,
                @Inject('cloudApiService') private cloudApi: any,
                ) {
        this.placeholder = '';
        this.topic = '';
        this.topicMessage = '';
    }

    ngOnInit() {
        this.translation.getTranslation(this.translation.currentLang).subscribe((lang) => {
            this.lang = lang;
            this.initForm();
            this.sendMessage = this.process.init(() => {
                return this.cloudApi.sendMessage(this.topic, this.data.productId, this.message, this.userName, this.userEmail, this.contact);
            }, {
                successMessage: this.lang.dialogs.message.sent
            }).then(() => {
                this.activeModal.close(true);
            });
        });
    }

    close() {
        this.activeModal.close();
    }

    initForm() {
        switch (this.messageType) {
            case this.config.messageType.ipvd_page :
                this.placeholder = this.lang.messageDialogPlaceholders.feedback;
                break;
            default :
                this.placeholder = '';
        }

        let title = this.lang.dialogs.message.title[this.messageType];
        if (this.messageType !== this.config.messageType.integration) {
            this.title = title.replace('{{product}}', this.data.productName);
        } else {
            this.title = title.replace('{{companyName}}', this.data.companyName);
        }
        this.topics = this.config.messageTopics[this.messageType].map((topic) => {
            return {
                id: topic,
                name: this.lang.dialogs.message.topic[topic].replace('{{product}}', this.data.productName)
            };
        });

        this.setTopic(this.topics[0]);

        this.account
            .get()
            .then((account) => {
                this.userName = account.first_name + ' ' + account.last_name ;
                this.userEmail = account.email;
            });
    }

    setTopic(topic) {
        this.topic = topic.id;
        this.topicMessage = topic.name;
    }
}

@Component({
    selector: 'nx-modal-message',
    template: '',
    encapsulation: ViewEncapsulation.None,
    styleUrls: []
})

export class NxModalMessageComponent implements OnInit {
    config: any;
    modalRef: NgbModalRef;

    constructor(private configService: NxConfigService,
                private modalService: NgbModal) {
        this.config = configService.getConfig();
    }

    private dialog(type, data) {
        // TODO: Refactor dialog to use generic dialog
        // TODO: retire loading ModalContent (CLOUD-2493)
        this.modalRef = this.modalService.open(MessageModalContent,
                {
                            windowClass: 'modal-holder',
                            backdrop: 'static'
                        });
        this.modalRef.componentInstance.closable = true;
        this.modalRef.componentInstance.messageType = type;
        this.modalRef.componentInstance.data = data;
        this.modalRef.componentInstance.config = this.config;


        return this.modalRef;
    }

    open(type, data) {
        return this.dialog(type, data).result;
    }

    ngOnInit() {
    }
}
