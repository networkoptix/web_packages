import { CommonModule } from '@angular/common';
import {
    Component,
    Input,
    OnChanges,
    OnInit,
    SimpleChanges,
    WritableSignal,
    booleanAttribute,
    inject,
    signal,
} from '@angular/core';
import { NgForm } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { defer, take } from 'rxjs';

import { NxPreLoaderComponent } from '@components/placeholders/pre-loader/pre-loader.component';
import { nxConfig } from '@services/nx-config/config';

import { AsyncAction } from './create-async-action';

@Component({
    selector: 'nx-async-action-button',
    templateUrl: 'async-action-button.component.html',
    styleUrls: ['async-action-button.component.scss'],
    standalone: true,
    imports: [CommonModule, TranslateModule, NxPreLoaderComponent],
})
export class NxAsyncActionButtonComponent<T> implements OnInit, OnChanges {
    @Input({ required: true }) action: AsyncAction<T>;
    @Input() disabled?: boolean;
    @Input({ transform: booleanAttribute }) disableFormValidation?: boolean;
    @Input() busy$$: WritableSignal<boolean> = signal(false);
    // Pass in from dialog to sync, otherwise only internal state
    @Input() buttonType: 'default' | 'primary' | 'danger' = 'primary';

    CONFIG = nxConfig;
    form?: NgForm;

    constructor() {
        try {
            // Will fail with NullInjectorError if not inside a form
            this.form = inject(NgForm);
        } catch (e) {
            if (e.name !== 'NullInjectorError') {
                throw e;
            }
        }
    }

    ngOnInit(): void {
        if (this.disableFormValidation) {
            this.form = undefined;
        }
    }

    // Signals extend function so gets excluded from NgChanges
    // eslint-disable-next-line @typescript-eslint/ban-types
    ngOnChanges({ busy$$ }: SimpleChanges): void {
        if (busy$$ && !busy$$.firstChange) {
            this.busy$$ = busy$$.previousValue;
            throw Error(
                'Change to busy$$ reference reverted, signals passed as inputs should be constant',
            );
        }
    }

    execute(): void {
        this.busy$$.set(true);
        const { action, success, error = console.error, postError } = this.action;
        const action$ = typeof action === 'function' ? defer(action) : action;

        action$.pipe(take(1)).subscribe({
            next: res => {
                success(res);
                this.busy$$.set(false);
            },
            error: err => {
                error(err);
                this.busy$$.set(false);
                postError?.();
            },
        });
    }
}
