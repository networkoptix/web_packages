import { CommonModule, DOCUMENT } from '@angular/common';
import { Component, forwardRef, Input, HostListener, ViewChild, Inject } from '@angular/core';
import { NG_VALUE_ACCESSOR, NgForm } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';

import { ProcessButtonModule } from '@components/process-button/process-button.module';
import { ProcessCancelButtonModule } from '@components/process-cancel-Button/process-cancel-Button.module';
import { Process } from '@services/process.service/process';

import { NxProcessButtonComponent } from '../process-button/process-button.component';

@Component({
    selector: 'nx-apply',
    templateUrl: 'apply.component.html',
    styleUrls: ['apply.component.scss'],
    providers: [
        {
            provide: NG_VALUE_ACCESSOR,
            // eslint-disable-next-line @typescript-eslint/no-use-before-define
            useExisting: forwardRef(() => NxApplyComponent),
            multi: true,
        },
    ],
    imports: [CommonModule, TranslateModule, ProcessButtonModule, ProcessCancelButtonModule],
    standalone: true,
})
export class NxApplyComponent {
    @ViewChild(NxProcessButtonComponent, { static: false }) processButton: NxProcessButtonComponent;
    @Input() save: Process;
    @Input() discard: () => void;
    @Input() warn: string;
    @Input() form: NgForm;
    @Input() forms: {};
    @Input() submitFn: () => void = () => null;
    @Input() showSectionWarning = false;
    @Input() showDiscard = false;

    show = false;
    applyVisible = false;
    isOnline = false;
    isSaveDisabled: boolean = false;
    ready = false;
    invalidFields: string[] = [];

    @HostListener('document:keypress', ['$event'])
    handleKeyboardEvent(event: KeyboardEvent): void {
        if (
            event.key === 'Enter' &&
            this.document.activeElement.tagName === 'INPUT' &&
            this.processButton &&
            !this.document.querySelector('.modal') && // Modal is active (old)
            !this.document.querySelector('cdk-dialog-container') // CDK dialogs
        ) {
            this.processButton.checkForm();
        }
    }

    constructor(@Inject(DOCUMENT) private document: Document) {}

    setIsSaveDisabled(isSaveDisabled: boolean): void {
        this.isSaveDisabled = isSaveDisabled;
    }
}
