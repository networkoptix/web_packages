import {
    Component, EventEmitter, Input, OnDestroy,
    OnInit, Output, SimpleChanges, OnChanges, ViewChild, ElementRef
}                       from '@angular/core';
import { UntilDestroy } from '@ngneat/until-destroy';

import { NxConfigService, IConfig }  from '@services/nx-config';
import { NxLanguageProviderService } from '@services/nx-language-provider';
import { Process }                   from '@services/process.service';
import { LanguageI18NStaticTypes }   from '@app/language_i18n_static_types';
import { fromEvent } from 'rxjs';
import { debounceTime } from 'rxjs/operators';

@UntilDestroy({ checkProperties: true })
@Component({
    selector    : 'nx-authorize-backup-code-component',
    templateUrl : 'backup-code.component.html',
    styleUrls   : ['backup-code.component.scss']
})
export class NxAuthorizeBackupCodeComponent implements OnInit, OnChanges, OnDestroy {
    CONFIG: IConfig;
    LANG: LanguageI18NStaticTypes;

    @Input() viewType: string;
    @Input() clientType: string;
    @Input() smallView: boolean;
    @Input() loginEmail: string;
    @Input() code: string;
    @Output() codeChange = new EventEmitter<string>();
    @Input() checkBackupCodeProcess: Process;
    @Input() errorCode: string;
    @Input() window: any;
    @Output() setCurrentState = new EventEmitter<string>();

    sendCode: any;
    @ViewChild('backupCodeForm', { static: false }) backupCodeForm: HTMLFormElement;
    @ViewChild('backToAuthSpan', { static: false }) backToAuthSpan: ElementRef;
    needLargerFooter = false;

    constructor(
        language: NxLanguageProviderService,
        configService: NxConfigService
    ) {
        this.LANG = language.translations;
        this.CONFIG = configService.getConfig();
    }

    ngOnInit(): void {
        this.sendCode = () => {
            this.codeChange.emit(this.code);
        };

        fromEvent(this.window, 'resize').pipe(debounceTime(100)).subscribe(() => {
            this.needLargerFooter = this.backToAuthSpan.nativeElement.offsetHeight > 32;
        });
    }

    ngOnChanges(changes: SimpleChanges) {
        if (changes.errorCode?.currentValue) {
            this.backupCodeForm?.controls.backupCode.setErrors({ [changes.errorCode.currentValue]: true });
        }
    }

    ngOnDestroy(): void {}
}
