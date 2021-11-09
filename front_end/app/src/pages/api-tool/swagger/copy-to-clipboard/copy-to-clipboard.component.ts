import { Component, OnInit } from '@angular/core';
import { LanguageI18NStaticTypes } from '@app/language_i18n_static_types';
import { NxToastService } from '@dialogs/toast.service';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { IConfig, NxConfigService } from '@services/nx-config';
import { NxLanguageProviderService } from '@services/nx-language-provider';
import { ClipboardService, IClipboardResponse } from 'ngx-clipboard';

@UntilDestroy()
@Component({
    selector: 'nx-copy-to-clipboard',
    templateUrl: './copy-to-clipboard.component.html',
    styleUrls: ['./copy-to-clipboard.component.scss']
})
export class NxCopyToClipboardComponent implements OnInit {
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
                    const options = {
                        classname: this.CONFIG.toast.success,
                        autohide: true,
                        delay: this.CONFIG.alertTimeout
                    };
                    this.toastService.show(this.LANG.common.copiedToClipboard(), options);
                }
            });
    }

    ngOnInit(): void {
    }

    copyToClipboard = (event: PointerEvent) => {
        const el = event.target as Element;
        const code = el.closest('.highlight-code').querySelector('.microlight');
        this.clipboardService.copy(code.textContent);
    }
}
