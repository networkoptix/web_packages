import {
    Component, Inject, Input, OnDestroy, OnInit
}                                               from '@angular/core';
import { DOCUMENT }                             from '@angular/common';
import { UntilDestroy }                         from '@ngneat/until-destroy';

import { NxConfigService, IConfig }             from '@services/nx-config';
import { NxLanguageProviderService }            from '@services/nx-language-provider';
import { LanguageI18NStaticTypes }              from '@app/language_i18n_static_types';

@UntilDestroy({ checkProperties: true })
@Component({
    selector    : 'nx-authorize-new-backup-code-component',
    templateUrl : 'new-backup-code.component.html',
    styleUrls   : ['new-backup-code.component.scss']
})
export class NxAuthorizeNewBackupCodeComponent implements OnInit, OnDestroy {
    CONFIG: IConfig;
    LANG: LanguageI18NStaticTypes;

    @Input() viewType: string;
    @Input() newBackupCode: string;
    @Input() confirm: (route?: string) => void;

    constructor(
        language: NxLanguageProviderService,
        configService: NxConfigService,
        @Inject(DOCUMENT) private document: Document,
    ) {
        this.LANG = language.translations;
        this.CONFIG = configService.getConfig();
    }

    ngOnInit(): void {}

    copyToClipboard(tooltip: any) {
        this.document.addEventListener('copy', (e: ClipboardEvent) => {
            e.clipboardData.setData('text/plain', (this.newBackupCode));
            e.preventDefault();
            this.document.removeEventListener('copy', null);
        });
        this.document.execCommand('copy');
        tooltip.open();
        setTimeout(() => {
            tooltip.close();
        }, 1500);
    }

    ngOnDestroy(): void {}
}
