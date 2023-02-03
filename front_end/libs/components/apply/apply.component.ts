import { DOCUMENT } from '@angular/common';
import { Component, forwardRef, Input, HostListener, ViewChild, Inject } from '@angular/core';
import { NG_VALUE_ACCESSOR, NgForm } from '@angular/forms';

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
    ready = false;
    invalidFields: string[] = [];

    _disabled: boolean;

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

    constructor(@Inject(DOCUMENT) private document: Document) {
        this._disabled = false;
    }

    setInvalidField(field: string): void {
        this.invalidFields.push(field);
        this._disabled = !!this.invalidFields.length;
    }

    unsetInvalidField(name: string): void {
        this.invalidFields.forEach((item, index) => {
            if (item === name) {
                this.invalidFields.splice(index, 1);
                this._disabled = !!this.invalidFields.length;
            }
        });
    }

    setInvalid(flag: boolean): void {
        this._disabled = flag;
    }
}
