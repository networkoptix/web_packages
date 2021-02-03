import {
    Component, EventEmitter, Input, OnChanges, OnDestroy,
    OnInit, Output, SimpleChanges
}                       from '@angular/core';
import { FormControl } from '@angular/forms';
import { UntilDestroy } from '@ngneat/until-destroy';

import { NxConfigService, IConfig }  from '@services/nx-config';
import { NxLanguageProviderService } from '@services/nx-language-provider';
import { Process }                   from '@services/process.service';
import { LanguageI18NStaticTypes }   from '../../../../language_i18n_static_types';

@UntilDestroy({ checkProperties: true })
@Component({
    selector    : 'nx-authorize-email-component',
    templateUrl : 'email.component.html',
    styleUrls   : ['email.component.scss']
})
export class NxAuthorizeEmailComponent implements OnInit, OnDestroy, OnChanges {
    CONFIG: IConfig;
    LANG: LanguageI18NStaticTypes;
    email = new FormControl();

    @Input() emailProcess: Process;
    @Input() errorCode: string;
    @Output() sendEmailToParent = new EventEmitter<string>();

    sendEmail: any;

    constructor(
        language: NxLanguageProviderService,
        configService: NxConfigService
    ) {
        this.LANG = language.translations;
        this.CONFIG = configService.getConfig();
    }

    ngOnInit(): void {
        this.sendEmail = () => {
            this.sendEmailToParent.emit(this.email.value);
        };
    }

    ngOnChanges(changes: SimpleChanges) {
        if (changes.errorCode) {
            this.email.setErrors({ [changes.errorCode.currentValue]: true });
        }
    }

    ngOnDestroy(): void {}
}
