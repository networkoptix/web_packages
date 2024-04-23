import { CommonModule } from '@angular/common';
import {
    Component,
    DestroyRef,
    EventEmitter,
    HostListener,
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
import { NgForm } from '@angular/forms';
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
 * If within a form, the button will match the status of the form after all controls
 * have been touched. This is because if button was always invalid for invalid forms,
 * this would create a blind spot if the last input was invalid but untouched since
 * the error messages for an input are only displayed after if touched so there
 * would be no obvious next step.
 *
 * When executing the action, the button enters a loading state and can be focused, but not fired.
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
    /** Fuction/element for focusing on error/initial reject */
    onErrFocus = input<(() => void) | { focus: () => void }>();

    /* Replace the signal with the input if you need to manually disable the button.
    Disabled state is different from invalid state!! Use the manualInvalid input for
    manual control of valid state */
    // disabled = input<boolean>(false);
    disabled = signal(false);

    /* Manual escape hatches for disabling default validation behaviors */
    /** Disable all form functionality */
    disableFormValidation = input<boolean, unknown>(false, { transform: booleanAttribute });
    /** Validate status before form controls have been touched/button has been clicked */
    noInvalidUntouchedClick = input<boolean, unknown>(false, { transform: booleanAttribute });
    /** Manual control for invalid state */
    manualInvalid = input<boolean>(false, { alias: 'invalid' });
    /** If the button has been clicked */
    private clicked = signal(false);
    /** When the first click is rejected */
    @Output() initialReject = new EventEmitter<void>();

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

    CONFIG = nxConfig;

    private formInvalid = signal(false);
    private allFormControlsTouched = signal(false);

    private formTouched = computed<boolean>(() => this.allFormControlsTouched() || this.clicked());
    private invalid = computed<boolean>(() => this.formInvalid() || this.manualInvalid());

    buttonInvalid$$ = computed(() => {
        const [formTouched, noInvalidUntouchedClick, invalid] = [
            this.formTouched(),
            this.noInvalidUntouchedClick(),
            this.invalid(),
        ];
        return (formTouched || noInvalidUntouchedClick) && invalid;
    });

    buttonClass = computed<string>(() => `btn-${this.buttonColor()}`);

    // The closest thing I could come up with for reactive touched updates
    // https://hidde.blog/console-logging-the-focused-element-as-it-changes/
    @HostListener('document:focusin', ['$event'])
    onFocusIn(): void {
        const controls = Object.values(this.form?.controls ?? {});
        if (controls.length) {
            this.allFormControlsTouched.set(controls.every(c => c.touched));
        }
    }

    private destroyRef = inject(DestroyRef);
    constructor(
        private translate: TranslateService,
        private toastService: NxToastService,
        @Optional() private form?: NgForm,
    ) {}

    ngOnInit(): void {
        if (this.disableFormValidation()) {
            this.form = undefined;
        } else if (this.form?.statusChanges) {
            this.formInvalid.set(!!this.form.invalid);
            this.form.statusChanges
                .pipe(takeUntilDestroyed(this.destroyRef), distinctUntilChanged())
                .subscribe(status => {
                    this.formInvalid.set(status === 'INVALID');
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

    private errFocus(): void {
        const onErrFocus = this.onErrFocus();
        if (!onErrFocus) {
            return;
        }

        if (typeof onErrFocus === 'function') {
            onErrFocus();
        } else {
            onErrFocus.focus();
        }
    }

    execute(): void {
        if (this.busy$$()) {
            return;
        }

        if (this.formInvalid() || this.manualInvalid()) {
            if (!this.formTouched()) {
                if (!this.noInvalidUntouchedClick()) {
                    this.form?.control.markAllAsTouched();
                    if (this.form) {
                        this.allFormControlsTouched.set(true);
                    }
                    this.initialReject.emit();
                    this.errFocus();
                }
                this.clicked.set(true);
            }
            return;
        }
        this.clicked.set(true);

        this.busy$$.set(true);
        const { action, success, error = this.defaultErrorHandle } = this.action();
        const action$ = typeof action === 'function' ? defer(action) : action;

        action$.pipe(take(1)).subscribe({
            next: res => {
                success(res);
                this.busy$$.set(false);
            },
            error: err => {
                error(err);
                this.busy$$.set(false);
                this.errFocus();
            },
        });
    }
}
