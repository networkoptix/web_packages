import { Overlay } from '@angular/cdk/overlay';
import { Location } from '@angular/common';
import { Injectable, Injector } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';
import { UntilDestroy } from '@ngneat/until-destroy';
import { SubscriptionLike } from 'rxjs';

import { LanguageI18NStaticTypes } from '@app/language_i18n_static_types';
import { DialogBase } from '@dialogs/dialog-base';
import { DialogConfig } from '@dialogs/dialog-config';
import { defaultConfig } from '@dialogs/dialog-ref';
import type { IConfig } from '@services/nx-config/config-types';
import { NxConfigService } from '@services/nx-config/nx-config.service';
import { NxLanguageProviderService } from '@services/nx-language-provider';

import { GenericModalContent } from './generic/generic.component';
import { NxToastService } from './toast.service';

@UntilDestroy({ checkProperties: true })
@Injectable({ providedIn: 'root' })
export class NxSimpleDialogsService extends DialogBase {
    LANG: LanguageI18NStaticTypes;
    CONFIG: IConfig;
    location: Location;
    closeResult: string;

    languageSubscription: SubscriptionLike;

    constructor(
        configService: NxConfigService,
        languageService: NxLanguageProviderService,
        location: Location,
        overlay: Overlay,
        injector: Injector,
        private toastService: NxToastService,
        private domSanitizer: DomSanitizer,
    ) {
        super(overlay, injector);
        this.CONFIG = configService.getConfig();
        this.location = location;

        this.languageSubscription = languageService.translateSubject
            .subscribe(() => {
                this.LANG = languageService.translations;
            });
    }

    public dismiss(): void {
        this.toastService.remove();
    }

    public notify(
        message: string,
        type: string = this.CONFIG.toast.info,
        hold?: boolean
    ): void {
        this.toastService.show(message, type, { autohide: !hold });
    }

    public confirm(
        message: string,
        title: string,
        actionLabel: string,
        actionType?: string,
        cancelLabel?: string,
        footerClass?: string
    ): any {
        const config: Partial<DialogConfig> = {
            data: {
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
            }
        };

        const dialogConfig: DialogConfig = Object.assign({}, defaultConfig, config);

        return this.open(GenericModalContent, dialogConfig);
    }

    public expiredSession() {
        return this.confirm(
            this.LANG.dialogs.renewAuth.message(),
            this.LANG.dialogs.renewAuth.title(),
            this.LANG.dialogs.buttons.ok()
        );
    }
}
