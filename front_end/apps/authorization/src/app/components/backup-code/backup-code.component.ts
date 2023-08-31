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
import { fromEvent } from 'rxjs';
import { debounceTime } from 'rxjs/operators';

import type { IConfig } from '@services/nx-config/config-types';
import { NxConfigService } from '@services/nx-config/nx-config.service';
import { Process } from '@services/process.service/process';
import { icons } from '@static-variables';
import { NgChanges } from '@utils/ng-changes';

import type { AuthorizeStateType } from '../authorize.component.types';
import { setupText, TemplateText } from '../setupText';

@UntilDestroy({ checkProperties: true })
@Component({
    selector: 'nx-authorize-backup-code-component',
    templateUrl: 'backup-code.component.html',
    styleUrls: ['backup-code.component.scss'],
})
export class NxAuthorizeBackupCodeComponent implements OnInit, OnChanges, OnDestroy {
    CONFIG: IConfig;
    icons = icons;

    @Input() viewType: string;
    @Input() clientType: string;
    @Input() smallView: boolean;
    @Input() loginEmail: string;
    @Input() code: string;
    @Output() codeChange = new EventEmitter<string>();
    @Input() checkBackupCodeProcess: Process;
    @Input() errorCode: string;
    @Input() window: Window;
    @Output() setCurrentState = new EventEmitter<AuthorizeStateType>();

    sendCode: () => void;
    @ViewChild('backupCodeForm', { static: false }) backupCodeForm: NgForm;
    @ViewChild('backToAuthSpan', { static: false }) backToAuthSpan: ElementRef<HTMLSpanElement>;
    needLargerFooter = false;
    header: string;
    subHeader: string | undefined;
    subHeaderSuffix: string | undefined;
    templateText: TemplateText;

    constructor(configService: NxConfigService) {
        this.CONFIG = configService.getConfig();
    }

    ngOnInit(): void {
        this.templateText = setupText();
        this.setText();

        this.sendCode = () => {
            this.codeChange.emit(this.code);
        };

        fromEvent<Event>(this.window, 'resize')
            .pipe(debounceTime(100))
            .subscribe(() => {
                this.needLargerFooter = this.backToAuthSpan.nativeElement.offsetHeight > 32;
            });
    }

    ngOnChanges(changes: NgChanges<NxAuthorizeBackupCodeComponent>): void {
        if (changes.errorCode?.currentValue) {
            this.backupCodeForm?.controls.backupCode.setErrors({
                [changes.errorCode.currentValue]: true,
            });
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

    ngOnDestroy(): void {}
}
