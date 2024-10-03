import { CommonModule } from '@angular/common';
import {
    ChangeDetectionStrategy,
    Component,
    computed,
    ElementRef,
    input,
    OnDestroy,
    Optional,
    Output,
    signal,
    SkipSelf,
} from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { finalize, from, share, take } from 'rxjs';

import { NxApplyV3Service } from '@components/forms/apply-v3/apply-v3.service';
import { NxFormObserverDirective } from '@components/forms/form-observer.directive';
import { AsyncAction } from '@dialogs/async-action-button/create-async-action';
import { NxEscapeGlobalStyleDirective } from '@directives/escape-global-style.directive';
import LANG from '@language_static';
import { nxConfig } from '@services/nx-config/config';
import { NxToastService } from '@services/toast.service';
import { AriaDisabledValue, ariaDisabledValue } from '@utils/general';

import { NxButtonLoadingDotsComponent } from '../button-loading-dots/button-loading-dots.component';

/** A button to handle asynchronous form submissions.
 *
 * There are currently three internal states:
 *
 * 1. Valid: No visible form errors. Can be focused and fired.
 * 2. Invalid: Form errors visible. Can be focused but not fired.
 * 3. Busy: Executing the request. Can be focused but not fired.
 *
 * Disabled is a potential fourth state, but there hasn't been a use case for it so far.
 *
 * Invalid form submissions will always be blocked, but the button itself will
 * only appear unclickable after errors are visible to the user in the form.
 *
 * If the `nx-apply-button` selector is used then the reset value for the form will
 * be updated on submit.
 */
@Component({
    selector: 'button[nx-async-submit-button], button[nx-apply-button]',
    templateUrl: 'async-submit-button.component.html',
    styleUrls: ['async-submit-button.component.scss'],
    standalone: true,
    imports: [CommonModule, TranslateModule, NxButtonLoadingDotsComponent],
    hostDirectives: [NxEscapeGlobalStyleDirective],
    host: {
        '[class]': 'colorClass()',
        '[class.nx-button--form-error]': 'hasErrorState()',
        '[class.nx-button--busy]': 'busy()',
        '[style.--color]': 'color()',
        '[attr.aria-disabled]': 'ariaDisabled()',
        type: 'submit',
        '(click)': 'execute()',
    },
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NxAsyncSubmitButtonComponent<T> implements OnDestroy {
    CONFIG = nxConfig;

    asyncAction = input.required<AsyncAction<T>>({ alias: 'action' });
    color = input<'primary' | 'danger' | 'default'>('primary');
    colorClass = computed<string>(() => `nx-button--${this.color()}`);

    busy = signal(false);
    @Output() busyChange = toObservable<boolean>(this.busy);

    /* NOT TO BE USED FOR PREVENTING INVALID FORM SUBMISSIONS.
    Remove this to restore the element property if you need to manually
    disable the button for some other reason */
    disabled = input<never>();

    isApplyButton = signal(false);
    hasErrorState = this.formObserver.hasErrorState;

    ariaDisabled = computed<AriaDisabledValue>(() =>
        ariaDisabledValue(this.busy() || this.hasErrorState()),
    );

    constructor(
        private translateService: TranslateService,
        private toastService: NxToastService,
        @Optional() @SkipSelf() private applyV3Service: NxApplyV3Service | null,
        @SkipSelf() protected formObserver: NxFormObserverDirective,
        host: ElementRef<HTMLButtonElement>,
    ) {
        this.isApplyButton.set(host.nativeElement.hasAttribute('nx-apply-button'));
        if (this.isApplyButton()) {
            /*
            Types of property '_initialFormValue' are incompatible.
              Type 'UnknownRecord' is not assignable to type 'ImmutableObject<UnknownRecord>'.
                'string' index signatures are incompatible.
                  Type 'unknown' is not assignable to type 'ImmutableObject<unknown>'. */
            this.applyV3Service?.formObservers.update(observers =>
                // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                // @ts-ignore Issue from signal immutability patch + strict editor config
                observers.concat(this.formObserver),
            );
        }
    }

    ngOnDestroy(): void {
        if (this.isApplyButton()) {
            this.applyV3Service?.formObservers.update(observers =>
                observers.filter(o => o !== this.formObserver),
            );
        }
    }

    private defaultErrorHandle = (error: unknown): void => {
        console.error(error);
        this.toastService.notify(
            this.translateService.instant(LANG.errorCodes.unexpectedError),
            'danger',
        );
    };

    execute(): void {
        if (this.busy()) {
            return;
        }

        const { form } = this.formObserver;
        if (form.invalid) {
            if (!form.submitted) {
                form.control.markAllAsTouched();
            }
            return;
        }
        form.control.disable();

        this.busy.set(true);
        const action = this.asyncAction().action();
        const action$ = (action instanceof Promise ? from(action) : action.pipe(take(1))).pipe(
            share(),
        );
        const { success, error = this.defaultErrorHandle } = this.asyncAction();

        if (this.isApplyButton()) {
            this.applyV3Service?.processingActions.update(actions => actions.concat(action$));
        }
        action$
            .pipe(
                finalize(() => {
                    if (this.isApplyButton()) {
                        this.applyV3Service?.processingActions.update(actions =>
                            actions.filter(a => a !== action$),
                        );
                    }
                }),
            )
            .subscribe({
                next: res => {
                    success(res);
                    this.busy.set(false);
                    form.control.enable();
                    if (this.isApplyButton()) {
                        this.formObserver.updateInitialValue();
                    }
                },
                error: err => {
                    error(err);
                    this.busy.set(false);
                    form.control.enable();
                },
            });
    }
}
