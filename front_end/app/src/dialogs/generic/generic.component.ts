import {
    Component,
    OnInit,
    Input,
    ViewEncapsulation
} from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';
import {
    NgbActiveModal,
    NgbModal,
    NgbModalRef
} from '@ng-bootstrap/ng-bootstrap';

import { LanguageI18NStaticTypes } from '@app/language_i18n_static_types';
import { NxLanguageProviderService } from '@services/nx-language-provider';

@Component({
    selector: 'nx-modal-generic-content',
    templateUrl: 'generic.component.html',
    styleUrls: ['generic.component.scss']
})
export class GenericModalContent implements OnInit {
    @Input() message;
    @Input() title;
    @Input() actionLabel;
    @Input() buttonType;
    @Input() cancelLabel;
    @Input() buttonClass;
    @Input() hasFooter;
    @Input() cancellable;
    @Input() closable;
    @Input() footerClass;

    constructor(public activeModal: NgbActiveModal) {}

    ngOnInit() {
        this.footerClass = this.footerClass || '';
        this.buttonClass = this.buttonClass || '';
        this.closable = !!this.closable;
    }

    ok() {
        this.activeModal.close(true);
    }

    close(action?) {
        this.activeModal.close(action);
    }
}

@Component({
    selector: 'nx-modal-general',
    template: '',
    encapsulation: ViewEncapsulation.None,
    styleUrls: []
})
export class NxModalGenericComponent {
    modalRef: NgbModalRef;
    LANG: LanguageI18NStaticTypes;

    constructor(
        language: NxLanguageProviderService,
        private domSanitizer: DomSanitizer,
        private modalService: NgbModal
    ) {
        this.LANG = language.translations;
    }

    private dialog(
        message,
        title,
        actionLabel,
        actionType?,
        cancelLabel?,
        footerClass?,
        hasFooter?,
        cancellable?,
        closable?
    ) {
        this.modalRef = this.modalService.open(GenericModalContent, {
            windowClass: 'modal-holder',
            backdrop: 'static'
        });

        this.modalRef.componentInstance.message =
            message ? this.domSanitizer.bypassSecurityTrustHtml(message) : '';
        this.modalRef.componentInstance.title = title;
        this.modalRef.componentInstance.actionLabel = actionLabel;
        this.modalRef.componentInstance.buttonType = actionType || 'default';
        this.modalRef.componentInstance.cancelLabel = cancelLabel;
        this.modalRef.componentInstance.buttonClass = actionType || 'btn-primary';
        this.modalRef.componentInstance.footerClass = footerClass || '';

        this.modalRef.componentInstance.hasFooter = hasFooter;
        this.modalRef.componentInstance.cancellable = cancellable;
        this.modalRef.componentInstance.closable = closable;

        return this.modalRef;
    }

    openConfirm(
        message,
        title,
        actionLabel,
        actionType?,
        cancelLabel?,
        footerClass?
    ) {
        return this.dialog(message, title, actionLabel,
            actionType,
            cancelLabel,
            footerClass,
            true,
            false,
            true)
            .result;
    }

    openAlert(message, title, footerClass?) {
        return this.dialog(message, title,
            this.LANG.dialogs.buttons.ok(),
            null,
            this.LANG.dialogs.buttons.cancel(),
            footerClass,
            true,
            true,
            true)
            .result;
    }
}
