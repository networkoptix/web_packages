import { CommonModule } from '@angular/common';
import {
    Component,
    DestroyRef,
    EventEmitter,
    Input,
    OnInit,
    Optional,
    Output,
    booleanAttribute,
    computed,
    effect,
    inject,
    input,
    signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AbstractControl, FormGroupDirective, NgForm } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { defer, distinctUntilChanged, take } from 'rxjs';

import { NxPreLoaderComponent } from '@components/placeholders/pre-loader/pre-loader.component';
import { ToastType } from '@components/toast-container/toast.types';
import LANG from '@language_static';
import { nxConfig } from '@services/nx-config/config';
import { NxToastService } from '@services/toast.service';

import { AsyncAction } from './create-async-action';

/** A button to handle asynchronous actions.
 *
 * If within a form, the button will match the status of the form after the first submit.
 * This is because if button was always invalid for invalid forms, this would create
 * a blind spot if the last input was invalid and focused since error messages are only displayed
 * after control touched/form submit so there would be no obvious next step.
 *
 * When executing the action, form controls are disabled
 * and the button enters a loading state which can be focused, but not fired.
 *
 * Similarly, when the button is in an invalid state it can be focused but not fired.
 */
@Component({
    selector: 'nx-async-action-button',
    templateUrl: 'async-action-button.component.html',
    styleUrls: ['async-action-button.component.scss'],
    standalone: true,
    imports: [CommonModule, TranslateModule, NxPreLoaderComponent],
})
export class NxAsyncActionButtonComponent<T> implements OnInit {
    action = input.required<AsyncAction<T>>();
    buttonColor = input<'default' | 'primary' | 'danger'>('primary');

    /* Disabled state is different from invalid state!
    // Use the manualInvalid input for manual control of valid state.
    */
    disabled = input<boolean>(false);

    /* Manual escape hatches for disabling default behaviors */
    /** Disable all form functionality */
    ignoreForm = input<boolean, unknown>(false, { transform: booleanAttribute });
    /** Validate status before first form submit/button click */
    noInvalidFirstSubmit = input<boolean, unknown>(false, { transform: booleanAttribute });
    /** Manual control for invalid state. Can be used alongside form state */
    manualInvalid = input<boolean>(false, { alias: 'invalid' });
    /** If the button has been clicked */
    private clicked = signal(false);

    @Input() set busy(state: boolean) {
        this.busy$$.set(state);
    }
    @Output() busyChange = new EventEmitter<boolean>();
    busy$$ = signal(false);
    _busyChangeEffect = effect(
        () => {
            const busy = this.busy$$();
            this.busyChange.emit(busy);
        },
        { allowSignalWrites: true },
    );

    /** Emits on invalid submit */
    @Output() reject = new EventEmitter<void>();

    CONFIG = nxConfig;

    private formInvalid = signal(false);
    private invalid = computed<boolean>(() => this.formInvalid() || this.manualInvalid());
    private formSubmitted = signal(false);
    private submitted = computed<boolean>(() => this.formSubmitted() || this.clicked());

    buttonInvalid$$ = computed(() => {
        const [submitted, noInvalidFirstSubmit, invalid] = [
            this.submitted(),
            this.noInvalidFirstSubmit(),
            this.invalid(),
        ];
        return (submitted || noInvalidFirstSubmit) && invalid;
    });

    buttonClass = computed<string>(() => `btn-${this.buttonColor()}`);

    private form: NgForm | FormGroupDirective | null;

    private destroyRef = inject(DestroyRef);
    constructor(
        private translate: TranslateService,
        private toastService: NxToastService,
        @Optional() form: NgForm | null,
        @Optional() formGroup: FormGroupDirective | null,
    ) {
        this.form = form || formGroup;
    }

    ngOnInit(): void {
        if (this.ignoreForm()) {
            this.form = null;
        } else if (this.form?.statusChanges) {
            this.formInvalid.set(!!this.form.invalid);
            this.form.statusChanges
                .pipe(takeUntilDestroyed(this.destroyRef), distinctUntilChanged())
                .subscribe(status => {
                    this.formInvalid.set(status === 'INVALID');
                });
            this.form.ngSubmit.pipe(take(1)).subscribe(() => {
                this.formSubmitted.set(true);
            });
        }
    }

    private defaultErrorHandle = (error: unknown): void => {
        console.error(error);
        this.toastService.notify(
            this.translate.instant(LANG.errorCodes.unexpectedError),
            ToastType.Danger,
        );
    };

    execute(): void {
        if (this.busy$$()) {
            return;
        }

        if (this.invalid()) {
            if (!this.submitted()) {
                this.clicked.set(true);
            }
            this.reject.emit();
            return;
        }
        this.clicked.set(true);

        const reEnable: AbstractControl[] = [];
        Object.values(this.form?.form.controls || {}).forEach(control => {
            if (!control.disabled) {
                control.disable();
                reEnable.push(control);
            }
        });
        this.busy$$.set(true);
        const { action, success, error = this.defaultErrorHandle } = this.action();
        const action$ = typeof action === 'function' ? defer(action) : action;

        action$.pipe(take(1)).subscribe({
            next: res => {
                success(res);
                this.busy$$.set(false);
                reEnable.forEach(c => c.enable());
            },
            error: err => {
                error(err);
                this.busy$$.set(false);
                reEnable.forEach(c => c.enable());
            },
        });
    }
}
