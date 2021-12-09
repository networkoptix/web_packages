import { Location } from '@angular/common';
import {
    Component,
    Input,
    ViewEncapsulation
} from '@angular/core';
import { NgForm } from '@angular/forms';
import { DomSanitizer } from '@angular/platform-browser';
import {
    NgbActiveModal,
    NgbModal,
    NgbModalRef
} from '@ng-bootstrap/ng-bootstrap';

import { LanguageI18NStaticTypes } from '@app/language_i18n_static_types';
import { NxLanguageProviderService } from '@services/nx-language-provider';
import { Process } from '@services/process.service';

@Component({
    selector: 'nx-modal-apply-content',
    templateUrl: 'apply.component.html',
    styleUrls: []
})
export class ApplyModalContent<Apply extends Process, Discard extends Function> {
    @Input() applyFunc: Apply;
    @Input() discardFunc: Discard;
    @Input() form: NgForm;

    constructor(
        public activeModal: NgbActiveModal
    ) {
    }

    apply = () => {
        if (this.form) {
            this.form.form.markAllAsTouched();
        }
        this.applyFunc.then(() => {
            this.activeModal.close('applied');
        }, () => {
            this.activeModal.close('canceled');
        });
    };

    close = () => {
        this.activeModal.dismiss('canceled');
    }

    discard = () => {
        this.activeModal.close('discarded');
        return this.discardFunc?.();
    }
}

@Component({
    selector: 'nx-modal-apply',
    template: '',
    encapsulation: ViewEncapsulation.None,
    styleUrls: []
})

export class NxModalApplyComponent {
    modalRef: NgbModalRef;
    LANG: LanguageI18NStaticTypes;

    constructor(
        private domSanitizer: DomSanitizer,
        private location: Location,
        private modalService: NgbModal,
        private language: NxLanguageProviderService
    ) {
        this.LANG = this.language.translations;
    }

    private dialog(applyFunc, discardFunc) {
        this.modalRef = this.modalService.open(ApplyModalContent,
            {
                windowClass: 'modal-holder',
                backdrop: 'static'
            });
        this.modalRef.componentInstance.applyFunc = applyFunc;
        this.modalRef.componentInstance.discardFunc = discardFunc;

        return this.modalRef;
    }

    open(applyFunc, discardFunc) {
        return this.dialog(applyFunc, discardFunc)
            .result;
    }
}
