import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';

import { NxAsyncSubmitButtonComponent } from '@components/forms/buttons/async-submit-button/async-submit-button.component';
import { NxResetButtonComponent } from '@components/forms/buttons/reset-button/reset-button.component';
import { NxSubmitButtonComponent } from '@components/forms/buttons/submit-button/submit-button.component';
import {
    NX_BASE_ERROR_MATCHES,
    errorMatcherFactory,
} from '@components/forms/form-field/error-state-matcher';
import { NxFormObserverDirective } from '@components/forms/form-observer.directive';
import { NxFormFieldModule } from '@components/forms/forms.module';
import { NxInputComponent } from '@components/forms/input/input.component';
import { NxValidators } from '@components/forms/validators';
import { NxSelectV2Module } from '@components/select-v2/select-v2.module';
import { NxToastService } from '@services/toast.service';

@Component({
    selector: 'nx-form-field-sandbox',
    templateUrl: 'form-field-sandbox.component.html',
    styleUrls: ['form-field-sandbox.component.scss'],
    standalone: true,
    imports: [
        CommonModule,
        ReactiveFormsModule,
        TranslateModule,
        NxFormFieldModule,
        NxInputComponent,
        NxSelectV2Module,
        NxAsyncSubmitButtonComponent,
        NxSubmitButtonComponent,
        NxResetButtonComponent,
        NxFormObserverDirective,
    ],
})
export class NxFormFieldSandboxComponent {
    toastService = inject(NxToastService);

    success(): void {
        this.toastService.notify('Success', 'success');
    }

    private emailControl = new FormControl('', {
        nonNullable: true,
        validators: [
            ...NxValidators.email(),
            (control: FormControl<string>) =>
                control.value.match(/a/i) ? { letterA: true } : null,
        ],
    });
    emailErrorMatcher = errorMatcherFactory(NX_BASE_ERROR_MATCHES, {
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

    delayedToastAction = {
        action: () =>
            new Promise<void>(resolve => {
                setTimeout(() => {
                    resolve();
                }, 1000);
            }),
        success: () => {
            this.success();
        },
    };

    private nameControl = new FormControl('Achilles', {
        nonNullable: true,
        validators: [Validators.required],
    });
    nameFormGroup = new FormGroup({
        name: this.nameControl,
    });
}
