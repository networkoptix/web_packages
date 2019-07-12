import { Component, Inject, OnInit, Input, ViewEncapsulation, Renderer2, ViewChild } from '@angular/core';
import { NgbModal, NgbActiveModal, NgbModalRef } from '@ng-bootstrap/ng-bootstrap';
import { EmailValidator, NgForm }                from '@angular/forms';
import { NxConfigService }                       from '../../services/nx-config';
import { TranslateService }                      from '@ngx-translate/core';
import { WINDOW }                                from '../../services/window-provider';
import { NxLanguageProviderService }             from '../../services/nx-language-provider';


export interface MessageParams {
    disclaimer: string;
    email?: string;
    product: string;
    productId?: string;
    to?: string;
}

interface Topic {
    id: string;
    name: string;
}

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

    LANG: any;

    placeholder: string;
    sendMessage: any;
    userName: string;
    userEmail: string;
    message: string;
    agree: boolean;
    title: string;
    topic: string;
    topicMessage: string;
    topics: Topic[];
    url: string;

    @ViewChild('feedbackForm') public feedbackForm: NgForm;

    constructor(private activeModal: NgbActiveModal,
                private renderer: Renderer2,
                private language: NxLanguageProviderService,
                @Inject('account') private account: any,
                @Inject('process') private process: any,
                @Inject('cloudApiService') private cloudApi: any,
                @Inject(WINDOW) private window: Window,
                ) {
        this.placeholder = '';
        this.topic = '';
        this.topicMessage = '';
        this.url = this.window.location.href;
    }

    ngOnInit() {
        this.LANG = this.language.getTranslations();

        this.initForm();
        this.sendMessage = this.process.init(() => {
            const product = this.data.productId || this.data.product;
            return this.cloudApi.sendMessage(this.topic, product, this.message, this.userName, this.userEmail);
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
        switch (this.messageType) {
            case this.config.messageType.ipvd_page :
                this.placeholder = this.LANG.messageDialogPlaceholders.feedback;
                break;
            default :
                this.placeholder = '';
        }

        const title = this.LANG.dialogs.message.title[this.messageType];
        if (this.messageType !== this.config.messageType.integration) {
            this.title = title.replace('{{product}}', this.data.product);
        } else {
            this.title = title.replace('{{companyName}}', this.data.to);
        }
        this.topics = this.config.messageTopics[this.messageType].map((topic) => {
            return {
                id: topic,
                name: this.LANG.dialogs.message.topic[topic].replace('{{product}}', this.data.product)
            };
        });

        this.setTopic(this.topics[0]);

        this.account
            .get()
            .then((account) => {
                this.userName = `${account.first_name} ${account.last_name}`;
                this.userEmail = account.email;
            });
    }

    setTopic(topic: Topic) {
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

    private dialog(type: string, data: MessageParams) {
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

    open(type: string, data: MessageParams) {
        return this.dialog(type, data).result;
    }

    ngOnInit() {
    }
}
