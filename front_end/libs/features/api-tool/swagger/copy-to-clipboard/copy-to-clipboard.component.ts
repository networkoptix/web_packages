import { Component } from '@angular/core';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { ClipboardService, IClipboardResponse } from 'ngx-clipboard';

import { ToastType } from '@components/toast-container/toast.types';
import staticLang from '@language_static';
import { NxToastService } from '@services/toast.service';
import { icons } from '@static-variables';

@UntilDestroy()
@Component({
    selector: 'nx-copy-to-clipboard',
    templateUrl: './copy-to-clipboard.component.html',
    styleUrls: ['./copy-to-clipboard.component.scss'],
})
export class NxCopyToClipboardComponent {
    LANG = staticLang;
    icons = icons;

    constructor(
        private clipboardService: ClipboardService,
        private toastService: NxToastService,
    ) {
        this.clipboardService.copyResponse$
            .pipe(untilDestroyed(this))
            .subscribe((res: IClipboardResponse) => {
                if (res.isSuccess) {
                    this.toastService.notify(this.LANG.common.copiedToClipboard, ToastType.Success);
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
