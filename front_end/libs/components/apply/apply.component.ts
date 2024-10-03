import { CommonModule, DOCUMENT } from '@angular/common';
import { Component, forwardRef, HostListener, Inject, Input, ViewChild } from '@angular/core';
import { NG_VALUE_ACCESSOR, NgForm } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';

import { NxProcessCancelButtonComponent } from '@components/process-cancel-Button/process-cancel-button.component';
import { Process } from '@services/process.service/process';

import { NxProcessButtonComponent } from '../process-button/process-button.component';

@Component({
    selector: 'nx-apply',
    templateUrl: 'apply.component.html',
    styleUrls: ['apply.component.scss'],
    providers: [
        {
            provide: NG_VALUE_ACCESSOR,
            useExisting: forwardRef(() => NxApplyComponent),
            multi: true,
        },
    ],
    imports: [
        CommonModule,
        TranslateModule,
        NxProcessCancelButtonComponent,
        NxProcessButtonComponent,
    ],
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
    @Input() show = false;

    @Input()
    set standaloneMode(standalone: boolean) {
        this.ready = standalone;
        this.isOnline = standalone;
        this.applyVisible = standalone;
    }

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
