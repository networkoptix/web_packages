import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { TranslateModule } from '@ngx-translate/core';
import { AngularSvgIconModule } from 'angular-svg-icon';
import { ClipboardService } from 'ngx-clipboard';

import { NxPreLoaderComponent } from '@components/placeholders/pre-loader/pre-loader.component';
import { ToastType } from '@components/toast-container/toast.types';
import { NxAddSvgSrcDirective } from '@directives/add-data.directive';
import staticLang from '@language_static';
import { NxToastService } from '@services/toast.service';
import { icons } from '@static-variables';

@Component({
    selector: 'nx-backup-codes',
    templateUrl: 'backup-codes.component.html',
    styleUrls: ['backup-codes.component.scss'],
    standalone: true,
    imports: [
        CommonModule,
        AngularSvgIconModule,
        TranslateModule,
        NxPreLoaderComponent,
        NxAddSvgSrcDirective,
    ],
})
export class NxBackupCodesComponent {
    @Input() codes: string[];

    icons = icons;

    readonly scrambledIndexes = [1, 5, 2, 6, 3, 7, 4, 8];
    /*
    1. codeNo1  5. codeNo5
    ...
    4. codeNo4  8. codeNo8
    */

    constructor(private clipboardService: ClipboardService, toastService: NxToastService) {
        clipboardService.copyResponse$.pipe(takeUntilDestroyed()).subscribe(res => {
            if (res.isSuccess) {
                toastService.notify(staticLang.common.copiedToClipboard, ToastType.Success);
            }
        });
    }

    copyToClipboard(): void {
        this.clipboardService.copy(this.codes.join('\n'));
    }
}
