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
    @Input() productName;
    @Input() product;
    @Input() showTo;
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
    }

    ngOnInit() {
        this.translation.getTranslation(this.translation.currentLang).subscribe((lang) => {
            this.lang = lang;
            this.initForm();
            this.sendMessage = this.process.init(() => {
                return this.cloudApi.sendMessage(this.topic, this.product.id, this.message, this.userName, this.userEmail, this.contact);
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

        this.title = this.lang.dialogs.message.title[this.messageType].replace('{{product}}', this.productName);
        this.topics = this.config.messageTopics[this.messageType].map((topic) => {
            return {
                id: topic,
                name: this.lang.dialogs.message.topic[topic].replace('{{product}}', this.productName)
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

    private dialog(type, showTo, productName, product) {
        // TODO: Refactor dialog to use generic dialog
        // TODO: retire loading ModalContent (CLOUD-2493)
        this.modalRef = this.modalService.open(MessageModalContent,
                {
                            windowClass: 'modal-holder',
                            backdrop: 'static'
                        });
        this.modalRef.componentInstance.closable = true;
        this.modalRef.componentInstance.messageType = type;
        this.modalRef.componentInstance.productName = productName;
        this.modalRef.componentInstance.product = product;
        this.modalRef.componentInstance.showTo = showTo;
        this.modalRef.componentInstance.config = this.config;


        return this.modalRef;
    }

    open(type, showTo, productName, product?) {
        if (productName === undefined) {
            productName = '';
        }
        if (product === undefined) {
            product = {
                id: productName
            };
        }

        return this.dialog(type, showTo, productName, product).result;
    }

    ngOnInit() {
    }
}
