import { CommonModule } from '@angular/common';
import {
    Component,
    EventEmitter,
    Input,
    OnInit,
    Output,
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
export class NxAsyncActionButtonComponent<T> implements OnInit {
    @Input({ required: true }) action: AsyncAction<T>;
    @Input() disabled?: boolean;
    @Input({ transform: booleanAttribute }) disableFormValidation?: boolean;
    @Input() buttonType: 'default' | 'primary' | 'danger' = 'primary';

    /* Compatibility patch for 23.3.X branches. No Angular version bumps means no access to model
    <[(busy)]="busy$$"> but new dialogs are still being created so we have to settle for
    <[busy]="busy$$()" (busyChange)="busy$$.set($event)"> which will make it easier to convert
    on develop when the time comes */
    @Input() set busy(state: boolean) {
        this.busy$$.set(state);
    }
    @Output() busyChange = new EventEmitter<boolean>();
    busy$$ = signal(false);

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

    execute(): void {
        this.busy$$.set(true);
        this.busyChange.emit(true);
        const { action, success, error = console.error, postError } = this.action;
        const action$ = typeof action === 'function' ? defer(action) : action;

        action$.pipe(take(1)).subscribe({
            next: res => {
                success(res);
                this.busy$$.set(false);
                this.busyChange.emit(false);
            },
            error: err => {
                error(err);
                this.busy$$.set(false);
                this.busyChange.emit(false);
                postError?.();
            },
        });
    }
}
