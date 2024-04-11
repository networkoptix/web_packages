import { CommonModule } from '@angular/common';
import {
    Component,
    Input,
    Output,
    EventEmitter,
    forwardRef,
    OnInit,
    ViewEncapsulation,
    OnChanges,
    booleanAttribute,
    input,
} from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import {
    NG_VALUE_ACCESSOR,
    ControlValueAccessor,
    NG_VALIDATORS,
    FormControl,
    Validator,
    ValidationErrors,
    FormsModule,
} from '@angular/forms';
import { BehaviorSubject } from 'rxjs';

import { NgChanges } from '@utils/ng-changes';

/* Usage
 <nx-checkbox
     name="remember" componentId="remember"
     [(ngModel)]="user.remember_me"
     (click)?="onClick($event)"
     checked?
     disabled? | [disabled]='isDisabled'?
     required?>
 </nx-checkbox>
 */

@Component({
    selector: 'nx-checkbox',
    templateUrl: 'checkbox.component.html',
    styleUrls: ['checkbox.component.scss'],
    standalone: true,
    imports: [CommonModule, FormsModule],
    providers: [
        {
            provide: NG_VALUE_ACCESSOR,
            useExisting: forwardRef(() => NxCheckboxComponent),
            multi: true,
        },
        {
            provide: NG_VALIDATORS,
            useExisting: forwardRef(() => NxCheckboxComponent),
            multi: true,
        },
    ],
    encapsulation: ViewEncapsulation.None,
})
export class NxCheckboxComponent<T = unknown>
    implements OnInit, OnChanges, ControlValueAccessor, Validator
{
    @Input() componentId: string;
    @Input({ transform: booleanAttribute }) required: boolean;
    @Input() checked: boolean;
    @Input({ transform: booleanAttribute }) disabled: boolean;
    @Input() labelText: string;
    @Input() ariaText: string = '';
    @Input() color: string;
    @Output() onClick = new EventEmitter<boolean>();

    public data$$ = input<undefined | T>(undefined, { alias: 'data' });

    public data$ = toObservable(this.data$$);

    public lastChange$ = new BehaviorSubject(Date.now());

    public value: boolean = false;
    public isCheckAll$ = new BehaviorSubject(false);

    // Placeholders for the callbacks which are later provided
    // by the Control Value Accessor
    private onTouchedCallback = (): void => {};
    private onChangeCallback = (_: boolean): void => {};

    // validates the form, returns null when valid else the validation object
    public validate(c: FormControl<string>): ValidationErrors | null {
        const err = {
            requiredError: {
                required: true,
            },
        };

        if (this.required && !c.value) {
            return err;
        } else {
            return null; // valid
        }
    }

    ngOnInit(): void {
        setTimeout(() => {
            // set state after model was updated
            if (this.checked !== undefined) {
                this.value = this.checked;
                this.lastChange$.next(Date.now());
            }
        });
    }

    ngOnChanges(changes: NgChanges<NxCheckboxComponent>): void {
        if (changes.checked) {
            this.value = changes.checked.currentValue;
        }
    }

    /**
     * Write a new (model) value to the element.
     */
    writeValue(value: boolean): void {
        if (value !== null) {
            this.value = value;
        }
    }

    /**
     * Set the function to be called
     * when the control receives a change event.
     */
    registerOnChange(fn: (_: boolean) => void): void {
        this.onChangeCallback = fn;
    }

    /**
     * Set the function to be called
     * when the control receives a touch event.
     */
    registerOnTouched(fn: () => void): void {
        this.onTouchedCallback = fn;
    }

    changeState(_event?: MouseEvent): void {
        if (this.disabled) {
            return;
        }

        this.onTouchedCallback();
        this.value = !this.value;
        this.onChangeCallback(this.value);
        this.onClick.emit(this.value);
    }

    notifyChange(): void {
        this.lastChange$.next(Date.now());
    }

    // Non input elements doesn't have onBlur ... keeping this just for reference
    // onBlur(): void {
    //     this.onTouchedCallback();
    // }
}
