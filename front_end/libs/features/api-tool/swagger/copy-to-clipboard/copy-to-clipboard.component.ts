import { Component } from '@angular/core';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { ClipboardService, IClipboardResponse } from 'ngx-clipboard';

import staticLang from '@common/language/language_i18n_static.json';
import { NxToastService } from '@dialogs/toast.service';
import { icons, toast } from '@lib/variables/static-variables';

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
                    this.toastService.notify(
                        this.LANG.common.copiedToClipboard,
                        toast.success,
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
