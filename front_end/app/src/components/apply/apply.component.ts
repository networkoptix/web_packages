import {
    Component,
    forwardRef,
    Input,
    HostListener,
    ViewChild
} from '@angular/core';
import { NG_VALUE_ACCESSOR, NgForm } from '@angular/forms';

import { Process } from '@services/process.service';

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
            multi: true
        }
    ]
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
            document.activeElement.tagName === 'INPUT' &&
            this.processButton &&
            !document.querySelector('.modal') // Modal is active
        ) {
            this.processButton.checkForm();
        }
    }

    constructor() {
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
