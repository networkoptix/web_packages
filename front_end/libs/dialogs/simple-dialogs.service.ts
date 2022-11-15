import { Overlay } from '@angular/cdk/overlay';
import { Location } from '@angular/common';
import { Injectable, Injector } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';
import { UntilDestroy } from '@ngneat/until-destroy';

import staticLang from '@common/language/language_i18n_static.json';
import { DialogBase } from '@dialogs/dialog-base';
import { DialogConfig } from '@dialogs/dialog-config';
import { defaultConfig } from '@dialogs/dialog-ref';
import { RefreshSessionModalContent } from '@dialogs/refresh-session/refresh-session';
import { Translatable } from '@pipes/any-translate.types';
import type { IConfig } from '@services/nx-config/config-types';
import { NxConfigService } from '@services/nx-config/nx-config.service';
import { NxSystem } from '@services/system.service/system';

import { toast } from '../variables/static-variables';

import { GenericModalContent } from './generic/generic.component';
import { NxToastService } from './toast.service';

@UntilDestroy({ checkProperties: true })
@Injectable({ providedIn: 'root' })
export class NxSimpleDialogsService extends DialogBase {
    LANG = staticLang;
    CONFIG: IConfig;
    location: Location;

    constructor(
        configService: NxConfigService,
        location: Location,
        overlay: Overlay,
        injector: Injector,
        private toastService: NxToastService,
        private domSanitizer: DomSanitizer,
    ) {
        super(overlay, injector);
        this.CONFIG = configService.getConfig();
        this.location = location;
    }

    public dismiss(): void {
        this.toastService.remove();
    }

    public notify(
        message: string,
        type: string = toast.info,
        hold?: boolean
    ): void {
        this.toastService.show(message, type, { autohide: !hold });
    }

    public confirm(
        message: string,
        title: Translatable,
        actionLabel: Translatable,
        actionType?: string,
        cancelLabel?: Translatable,
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

        return this.open(GenericModalContent, dialogConfig).afterClosed();
    }

    public expiredSession() {
        return this.confirm(
            this.LANG.dialogs.renewAuth.message,
            this.LANG.dialogs.renewAuth.title,
            this.LANG.dialogs.buttons.ok
        );
    }

    public refreshSession(system: NxSystem) {
        const config: Partial<DialogConfig> = {
            data: {
                system
            }
        };
        const dialogConfig: DialogConfig = Object.assign({}, defaultConfig, config);
        return this.open(RefreshSessionModalContent, dialogConfig).afterClosed();
    }
}
