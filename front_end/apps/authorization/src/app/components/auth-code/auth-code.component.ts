import {
    Component,
    EventEmitter,
    Input,
    OnDestroy,
    OnInit,
    Output,
    OnChanges,
    ViewChild,
    ElementRef,
} from '@angular/core';
import type { NgForm } from '@angular/forms';
import { UntilDestroy } from '@ngneat/until-destroy';
import { TranslateService } from '@ngx-translate/core';
import { fromEvent } from 'rxjs';
import { debounceTime } from 'rxjs/operators';

import staticLang from '@common/language/language_i18n_static.json';
import type { IConfig } from '@services/nx-config/config-types';
import { NxConfigService } from '@services/nx-config/nx-config.service';
import { Process } from '@services/process.service/process';
import { NgChanges } from '@utils/ng-changes';

import type { AuthorizeStateType } from '../authorize.component.types';
import { setupText, TemplateText } from '../setupText';

@UntilDestroy({ checkProperties: true })
@Component({
    selector: 'nx-authorize-auth-code-component',
    templateUrl: 'auth-code.component.html',
    styleUrls: ['auth-code.component.scss']
})
export class NxAuthorizeAuthCodeComponent implements OnInit, OnChanges, OnDestroy {
    CONFIG: IConfig;
    LANG = staticLang;

    @Input() viewType: string;
    @Input() clientType: string;
    @Input() smallView: boolean;
    @Input() action: string;
    @Input() loginEmail: string;
    @Input() code: string;
    @Output() codeChange = new EventEmitter<string>();
    @Input() checkAuthCodeProcess: Process;
    @Input() errorCode: string;
    @Input() window: Window;
    @Output() setCurrentState = new EventEmitter<AuthorizeStateType>();

    sendCode: () => void;
    @ViewChild('authCodeForm', { static: false }) authCodeForm: NgForm;
    @ViewChild('backToPasswordSpan', { static: false }) backToPasswordSpan: ElementRef<HTMLSpanElement>;
    needLargerFooter = false;
    restore = false;
    header: string;
    subHeader: string | undefined;
    subHeaderSuffix: string | undefined;
    suffixText: string;
    templateText: TemplateText;

    constructor(
        configService: NxConfigService,
        private translateService: TranslateService,
    ) {
        this.CONFIG = configService.getConfig();
    }

    ngOnInit(): void {
        this.sendCode = () => {
            this.codeChange.emit(this.code);
        };

        this.restore = this.action === 'restore_password';
        this.templateText = setupText();
        this.setText();
        this.suffixText = this.translateService.instant(
            this.LANG.authorize.authCode.message,
            {
                suffix: this.restore
                    ? this.translateService.instant(this.LANG.authorize.authCode.newPass)
                    : this.translateService.instant(this.LANG.authorize.authCode.login)
            });

        fromEvent<Event>(this.window, 'resize')
            .pipe(debounceTime(100))
            .subscribe(() => {
                this.needLargerFooter = this.backToPasswordSpan.nativeElement.offsetHeight > 32;
            });
    }

    ngOnChanges(changes: NgChanges<NxAuthorizeAuthCodeComponent>): void {
        if (changes.errorCode?.currentValue) {
            this.authCodeForm?.controls.authCode.setErrors({ [changes.errorCode.currentValue]: true });
        }

        if (!changes.clientType?.firstChange) {
            this.setText();
        }
    }

    setText(): void {
        this.header = this.templateText[this.clientType]?.header;
        this.subHeader = this.templateText[this.clientType]?.subHeader;
        if (this.clientType.includes('Password')) {
            this.subHeaderSuffix = this.templateText[this.clientType]?.subHeaderSuffix;
        }
    }

    ngOnDestroy(): void { }
}
