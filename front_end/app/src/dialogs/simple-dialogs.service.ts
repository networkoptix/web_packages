import { DOCUMENT, Location } from '@angular/common';
import { Inject, Injectable } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { UntilDestroy } from '@ngneat/until-destroy';
import { SubscriptionLike } from 'rxjs';

import { LanguageI18NStaticTypes } from '@app/language_i18n_static_types';
import { NxLanguageProviderService } from '@services/nx-language-provider';

import { IConfig, NxConfigService } from '../services/nx-config';

import { GenericModalContent } from './generic/generic.component';
import { NxToastService } from './toast.service';

interface IParams<Value = any> {
    [key: string]: Value;
}

@UntilDestroy({ checkProperties: true })
@Injectable({ providedIn: 'root' })
export class NxSimpleDialogsService {
    LANG: LanguageI18NStaticTypes;
    CONFIG: IConfig;
    location: Location;
    closeResult: string;

    languageSubscription: SubscriptionLike;

    constructor(
        configService: NxConfigService,
        languageService: NxLanguageProviderService,
        location: Location,
        @Inject(DOCUMENT) private document: Document,
        private modalService: NgbModal,
        private toastService: NxToastService,
        private domSanitizer: DomSanitizer
    ) {
        this.CONFIG = configService.getConfig();
        this.location = location;

        this.languageSubscription = languageService.translateSubject
            .subscribe(() => {
                this.LANG = languageService.translations;
            });
    }

    public ngOnDestroy() {
    }

    public dismiss() {
        this.toastService.remove();
    }

    public notify(message: string, type: string, hold?: boolean) {
        type = type || this.CONFIG.toast.info;
        hold = hold || false;

        const options = {
            autohide: !hold,
            classname: type,
            delay: this.CONFIG.alertTimeout
        };

        return this.toastService.show(message, options);
    }

    public createModal<Modal, Options extends IParams, Inputs extends IParams, Result extends any>(
        modal: Modal, options: Options, inputs: Inputs
    ): Promise<Result> {
        const modalRef = this.modalService.open(modal, options);
        Object.assign(modalRef.componentInstance, inputs);
        return modalRef.result;
    }

    public confirm (
        message: string,
        title: string,
        actionLabel: string,
        actionType?: string,
        cancelLabel?: string,
        footerClass?: string
    ): any {
        const options: IParams = {
            windowClass: 'modal-holder',
            backdrop: 'static'
        };

        const params: IParams = {
            message: message ? this.domSanitizer.bypassSecurityTrustHtml(message) : '',
            title,
            actionLabel,
            buttonType: actionType || 'default',
            cancelLabel,
            buttonClass: actionType || 'btn-primary',
            footerClass: footerClass || '',
            hasFooter: true,
            cancellable: false,
            closable: false
        };

        return this.createModal(GenericModalContent, options, params);
    }

    public expiredSession() {
        return this.confirm(
            this.LANG.dialogs.renewAuth.message(),
            this.LANG.dialogs.renewAuth.title(),
            this.LANG.dialogs.buttons.ok()
        );
    }
}
