import { Component } from '@angular/core';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { ClipboardService, IClipboardResponse } from 'ngx-clipboard';

import { LanguageI18NStaticTypes } from '@common/language/language_i18n_static_types';
import { NxToastService } from '@dialogs/toast.service';
import type { IConfig } from '@services/nx-config/config-types';
import { NxConfigService } from '@services/nx-config/nx-config.service';
import { NxLanguageProviderService } from '@services/nx-language-provider';

@UntilDestroy()
@Component({
    selector: 'nx-copy-to-clipboard',
    templateUrl: './copy-to-clipboard.component.html',
    styleUrls: ['./copy-to-clipboard.component.scss']
})
export class NxCopyToClipboardComponent {
    CONFIG: IConfig;
    LANG: LanguageI18NStaticTypes;

    constructor(private configService: NxConfigService,
        private clipboardService: ClipboardService,
        private toastService: NxToastService,
        private languageService: NxLanguageProviderService) {
        this.CONFIG = this.configService.getConfig();
        this.LANG = this.languageService.translations;

        this.clipboardService.copyResponse$
            .pipe(untilDestroyed(this))
            .subscribe((res: IClipboardResponse) => {
                if (res.isSuccess) {
                    this.toastService.notify(
                        this.LANG.common.copiedToClipboard(),
                        this.CONFIG.toast.success,
                    );
                }
            });
    }

    copyToClipboard = (event: MouseEvent): void => {
        const el = event.target as Element;
        const parent = el.closest('.highlight-code, nx-swagger-textarea, li');
        const code = parent.querySelector('.microlight, .text-area, pre');
        this.clipboardService.copy(code.textContent);
    };
}
