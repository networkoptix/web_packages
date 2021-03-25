import {
    Component, forwardRef, Input,
    HostListener, ViewChild
}                                    from '@angular/core';
import { NG_VALUE_ACCESSOR, NgForm } from '@angular/forms';
import { NxProcessButtonComponent }  from '../process-button/process-button.component';

@Component({
    selector    : 'nx-apply',
    templateUrl : 'apply.component.html',
    styleUrls   : ['apply.component.scss'],
    providers   : [
        {
            provide     : NG_VALUE_ACCESSOR,
            useExisting : forwardRef(() => NxApplyComponent),
            multi       : true
        }
    ]
})
export class NxApplyComponent {
    @ViewChild(NxProcessButtonComponent, { static: false }) processButton: NxProcessButtonComponent;
    @Input() save;
    @Input() discard;
    @Input() warn: string;
    @Input() form: NgForm;
    @Input() submitFn: () => any = () => null;
    @Input() showSectionWarning = false;
    @Input() showDiscard = false;

    show = false;
    applyVisible = false;
    isOnline = false;
    ready = false;
    invalidFields = [];

    _disabled: boolean;

    @HostListener('document:keypress', ['$event'])
    handleKeyboardEvent(event: KeyboardEvent) {
        if (event.key === 'Enter' && document.activeElement.tagName === 'INPUT' && this.processButton) {
            this.processButton.checkForm();
        }
    }

    constructor() {
        this._disabled = false;
    }

    setInvalidField(field) {
        this.invalidFields.push(field);
        this._disabled = !!this.invalidFields.length;
    }

    unsetInvalidField(name) {
        this.invalidFields.forEach((item, index) => {
            if (item === name) {
                this.invalidFields.splice(index, 1);
                this._disabled = !!this.invalidFields.length;
            }
        });
    }
}
