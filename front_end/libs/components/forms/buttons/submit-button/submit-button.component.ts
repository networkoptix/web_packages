import {
    ChangeDetectionStrategy,
    Component,
    computed,
    ElementRef,
    input,
    OnDestroy,
    SkipSelf,
} from '@angular/core';

import { NxFormObserverDirective } from '@components/forms/form-observer.directive';
import { AriaDisabledValue, ariaDisabledValue } from '@utils/general';

/** Synchronous version of `nx-async-submit-button`.
 *
 * Since there's no internal busy state to manage, the submit action isn't
 * handled in the button.
 */
@Component({
    selector: 'button[nx-submit-button]',
    template: `<ng-content></ng-content>`,
    styleUrls: ['submit-button.component.scss'],
    standalone: true,
    imports: [],
    host: {
        '[class]': 'colorClass()',
        '[class.nx-button--form-error]': 'hasErrorState()',
        '[style.--color]': 'color()',
        '[attr.aria-disabled]': 'ariaDisabled()',
        type: 'submit',
    },
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NxSubmitButtonComponent implements OnDestroy {
    color = input<'primary' | 'danger' | 'default'>('primary');
    colorClass = computed<string>(() => `nx-button--${this.color()}`);

    /* NOT TO BE USED FOR PREVENTING INVALID FORM SUBMISSIONS.
    Remove this to restore the element property if you need to manually
    disable the button for some other reason */
    disabled = input<never>();

    hasErrorState = this.formObserver.hasErrorState;
    ariaDisabled = computed<AriaDisabledValue>(() => ariaDisabledValue(this.hasErrorState()));

    constructor(
        @SkipSelf() protected formObserver: NxFormObserverDirective,
        private host: ElementRef<HTMLButtonElement>,
    ) {
        host.nativeElement.addEventListener('click', this.onClick, true);
        // https://github.com/angular/angular/issues/9587#issuecomment-812869074
    }

    ngOnDestroy(): void {
        this.host.nativeElement.removeEventListener('click', this.onClick, true);
    }

    onClick = (event: MouseEvent): void => {
        const { form } = this.formObserver;
        if (form.invalid) {
            event.stopImmediatePropagation();
            if (!form.submitted) {
                form.control.markAllAsTouched();
            }
        }
    };
}
