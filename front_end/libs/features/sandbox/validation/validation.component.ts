import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import {
    FormControl,
    FormGroup,
    FormsModule,
    ReactiveFormsModule,
    Validators,
} from '@angular/forms';

import { NxEmailComponent } from '@components/email-input/email.component';
import { NxControlMessageComponent } from '@components/forms/control-messages/control-message/control-message.component';
import { NxControlMessagesComponent } from '@components/forms/control-messages/control-messages.component';
import { errorMatcherFactory } from '@components/forms/form-field/error-state-matcher';
import { NxFormFieldComponent } from '@components/forms/form-field/form-field.component';
import { NxInputComponent } from '@components/forms/input/input.component';
import { NxLabelComponent } from '@components/forms/label/label.component';
import { ControlPresets } from '@components/forms/validators';
import { NxPasswordComponent } from '@components/password-input/password.component';
import { NxPasswordValidationComponent } from '@components/password-input-validation/password-validation.component';
import { NxProcessButtonComponent } from '@components/process-button/process-button.component';
import { NxSelectV2ItemComponent } from '@components/select-v2/items/select-item/select-item.component';
import { NxSelectV2Component } from '@components/select-v2/select-v2.component';
import { NxAsyncActionButtonComponent } from '@dialogs/async-action-button/async-action-button.component';
import { NxMenuService } from '@menu/menu.service';
import { NxProcessService } from '@services/process.service';
import { Process } from '@services/process.service/process';
import { simpleEmailRegex } from '@static-variables';

@Component({
    selector: 'validation',
    templateUrl: 'validation.component.html',
    styleUrls: ['validation.component.scss'],
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        ReactiveFormsModule,
        NxEmailComponent,
        NxProcessButtonComponent,
        NxPasswordComponent,
        NxPasswordValidationComponent,

        NxFormFieldComponent,
        NxInputComponent,
        NxControlMessagesComponent,
        NxControlMessageComponent,
        NxLabelComponent,
        NxSelectV2Component,
        NxSelectV2ItemComponent,
        NxAsyncActionButtonComponent,
    ],
})
export class ValidationComponent {
    data = {
        newPassword: '',
        email: '',
    };
    change: Process;
    restore: Process;

    constructor(
        private processService: NxProcessService,
        private menuService: NxMenuService,
    ) {}

    ngOnInit(): void {
        this.menuService.selectedSection$$.set('components');
        this.menuService.selectedDetailsSection$$.set('validation');

        this.change = this.processService.createProcess(() => {
            return Promise.resolve(true);
        });

        this.restore = this.processService.createProcess(() => {
            return Promise.resolve(true);
        });
    }

    private emailControl = new FormControl('', {
        nonNullable: true,
        validators: [
            Validators.maxLength(10),
            Validators.pattern(simpleEmailRegex),
            Validators.required,
            (control: FormControl<string>) =>
                control.value.match(/a/i) ? { letterA: true } : null,
        ],
    });
    emailErrorMatcher = errorMatcherFactory(ControlPresets.RequiredEmail, {
        onChange: ['letterA'],
    });
    emailFormGroup = new FormGroup({
        email: this.emailControl,
    });

    quotes = [
        { source: 'Hamlet', text: 'To be, or not to be, that is the question' },
        {
            source: 'Star Wars',
            text: "Did you ever hear the tragedy of Darth Plagueis The Wise? I thought not. It's not a story the Jedi would tell you.",
        },
    ];
    quoteControl = new FormControl<string | null>(null, {
        validators: [Validators.required],
    });
    quoteFormGroup = new FormGroup({
        quote: this.quoteControl,
    });

    doNothingAction = {
        action: () => Promise.resolve(),
        success: () => {},
    };
}
