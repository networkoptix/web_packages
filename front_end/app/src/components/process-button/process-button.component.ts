import {
    Component,
    OnInit,
    Input,
    ViewEncapsulation
} from '@angular/core';

import { NxConfigService, IConfig } from '@services/nx-config';
import { Process } from '@services/process.service';

interface SvgData {
    src: string;
    color?: string;
    height?: string;
    width?: string;
}

@Component({
    selector: 'nx-process-button',
    templateUrl: 'process-button.component.html',
    styleUrls: ['process-button.component.scss'],
    encapsulation: ViewEncapsulation.None
})
export class NxProcessButtonComponent implements OnInit {
    @Input() process: Process;
    @Input() clickFn: () => void;
    @Input() buttonText: string;
    @Input() buttonDisabled: boolean;
    @Input() buttonDisabledInProgress: boolean;
    @Input() actionType: string;
    @Input() form;
    @Input() customClass: unknown = '';
    @Input() customButtonClass = '';
    @Input() svg: SvgData;
    @Input() textOnly: boolean = false;
    @Input() reverseButton = false;
    @Input() removeMinWidth = false;

    buttonClass: string;
    CONFIG: IConfig;

    constructor(configService: NxConfigService) {
        this.CONFIG = configService.getConfig();
    }

    ngOnInit() {
        if (!this.clickFn) {
            this.clickFn = () => {
            };
        }

        this.buttonClass = 'btn-primary';
        if (this.actionType) {
            this.buttonClass = 'btn-' + this.actionType;
        }
    }

    touchForm() {
        const form = this.form.form || this.form;
        for (const ctrl in form.controls) {
            // eslint-disable-next-line no-prototype-builtins
            if (form.controls.hasOwnProperty(ctrl)) {
                form.get(ctrl).markAsTouched();
                form.get(ctrl).markAsDirty();
            }
        }
    }

    setFocusToInvalid() {
        const form = this.form.form || this.form;
        for (const ctrl in form.controls) {
            // eslint-disable-next-line no-prototype-builtins
            if (form.controls.hasOwnProperty(ctrl)) {
                if (form.get(ctrl).invalid) {
                    // TODO : Use Renderer2 to set focus
                    // control.focused = true;
                    return;
                }
            }
        }
    }

    checkForm() {
        if (this.form && !this.form.valid) {
            // Set the form touched
            this.touchForm();
            this.setFocusToInvalid();

            return false;
        } else {
            this.process.run();
        }
    }

    clickHandler(event) {
        event.stopPropagation();
        this.clickFn();
        this.checkForm();
    }
}
